#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <EEPROM.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// PWM channel layout (PCA9685):
//   ch0-3   = LEDs (1-indexed: LED 1 = ch0 ... LED 4 = ch3)
//   ch4-6   = Module 1 (bottom, paddle, pusher)
//   ch7-9   = Module 2
//   ch10-12 = Module 3
//   ch13    = Feeder (360° continuous rotation servo)
//   ch14    = Scan light (LED 5) — angled holo-detection light, toggled by the
//             web app for two-frame foil scans
#define NUM_MODULES 3
#define MODULE_CHANNEL_OFFSET 4
#define FEEDER_CHANNEL 13

// IR sensor pins — one per module (active LOW: pin reads LOW when card is present)
#define IR_PIN_MODULE1 2
#define IR_PIN_MODULE2 3
#define IR_PIN_MODULE3 4
#define IR_TIMEOUT_MS  3000  // max ms to wait for a card before aborting

// Any module where a card sits at the gate continuously for this long with no
// routing command in progress (e.g. the app never sent a bin command) is
// reported as a jam. Only checked while idle (runMachine()).
#define JAM_TIMEOUT_MS 20000

// Hopper IR sensor — active LOW: pin reads LOW while cards remain in the feeder stack
#define IR_PIN_HOPPER 5

// Declared here (before any function) because the Arduino builder hoists
// auto-generated function prototypes to the top of the file, above any type
// defined later — if these enums were declared next to the operation machine
// instead, the hoisted prototypes would precede them and fail to compile
// ("OpKind was not declared in this scope").
enum OpKind { OP_NONE, OP_ROUTE, OP_FEED, OP_TEST, OP_CLEAR };

enum Phase {
  PH_NONE,
  PH_FEED_RUN,     // feeder on; exit on module-1 IR edge or duration timeout
  PH_FEED_SETTLE,  // feeder on for settleDuration (last-card push into module 1)
  PH_WAIT_SENSOR,  // wait for a card at op.waitModule (IR_TIMEOUT_MS)
  PH_CARD_ENTER,   // DELAY_CARD_ENTER after the sensor sees the card
  PH_PADDLE,       // paddle open on op.waitModule (DELAY_PADDLE)
  PH_PUSH,         // pusher to side on op.waitModule (DELAY_PUSH)
  PH_NEUTRAL,      // all servos neutral + 200ms
  PH_HOLD,         // generic timed hold (op.holdMs), then neutral
  PH_TEST_OPEN,    // open bottoms + paddles (DELAY_PUSH)
  PH_TEST_LEFT,    // pushers left (DELAY_PUSH)
  PH_TEST_RIGHT,   // pushers right (DELAY_PUSH)
  PH_TEST_FEED,    // feeder on (500ms)
  PH_TEST_LED_ON,  // LED op.ledIndex on (150ms)
  PH_TEST_LED_OFF, // LED op.ledIndex off (100ms)
  PH_CLEAR_OPEN,   // all bottoms open (DELAY_PUSH)
};

int irPin(int module) {
  if (module == 1) return IR_PIN_MODULE1;
  if (module == 2) return IR_PIN_MODULE2;
  return IR_PIN_MODULE3;
}

bool hopperHasCards() {
  return digitalRead(IR_PIN_HOPPER) == LOW;
}

// ─── Interrupt-driven module-1 card detection ────────────────────────────────
// The feeder stops the instant the beam is crossed instead of waiting for a
// poll — this is what lets the motor run continuously (no pulse/pause cycling).
volatile bool g_m1CardSeen = false;

void onModule1IR() {
  if (digitalRead(IR_PIN_MODULE1) == LOW) g_m1CardSeen = true;
}

// ─── Non-blocking operation machine ──────────────────────────────────────────
// Every mechanical operation (feed, route, test, clear) is a state machine run
// from loop(), so serial stays responsive mid-operation: {"cancel":true} aborts
// any phase, jam alerts abort immediately, and new commands while busy get a
// clean {"error":"busy"} instead of being swallowed by a blocking delay().

struct OpState {
  OpKind kind;
  Phase phase;
  int bin;         // OP_ROUTE target bin (1-7)
  int waitModule;  // module whose IR sensor we're waiting for
  bool pushLeft;
  unsigned long holdMs;
  int ledIndex;
  unsigned long phaseStart;
  unsigned long deadline;  // whole-operation watchdog
  int replyId;             // command id to echo when the op completes
  bool hasReplyId;
};

OpState op;               // zero-initialized → kind = OP_NONE
bool cancelRequested = false;

// Any module where a card sits at the gate continuously for this long with no
// routing command in progress (e.g. the app never sent a bin command) is
// reported as a jam. Only checked while idle — runMachine() services it.
unsigned long modulePresentSince[NUM_MODULES + 1] = {0, 0, 0, 0};
bool moduleJamAlerted[NUM_MODULES + 1] = {false, false, false, false};

// New jam alert during an operation sets this flag so the active command
// aborts to neutral instead of driving servos into a jammed mechanism.
bool jamAbortRequested = false;

struct ModuleConfig {
  int bottomClosed, bottomOpen;
  int paddleClosed, paddleOpen;
  int pusherLeft, pusherNeutral, pusherRight;
};

ModuleConfig moduleConfig[NUM_MODULES] = {
  {300, 310, 300, 310, 295, 300, 305},
  {300, 310, 300, 310, 295, 300, 305},
  {300, 310, 300, 310, 295, 300, 305},
};

struct FeederConfig {
  int speed;          // PWM pulse for forward motion
  int duration;       // overall timeout (ms) — max total time before giving up
  int pulseDuration;  // kept for config compatibility (0 = continuous feed)
  int pauseDuration;  // kept for config compatibility
  int settleDuration; // ms to keep feeding after the IR first sees the card, so it
                       // travels all the way into the module 1 mechanism instead of
                       // stopping right at the sensor's beam
};

FeederConfig feederConfig = {400, 3000, 0, 50, 150};

// ─── Calibration persistence (EEPROM) ───────────────────────────────────────
// Module/feeder config is persisted so a reboot (e.g. a power blip mid-run)
// restores the tuned values instead of silently reverting to stock pulses.
// The magic + version guard detects stale data from older firmware or a
// hardware change (e.g. servo swap) and falls back to factory defaults.
#define CONFIG_MAGIC       0x4D56  // "MV"
#define CONFIG_VERSION     1
#define CONFIG_EEPROM_ADDR 0

struct PersistedCalibration {
  uint16_t magic;
  uint8_t version;
  ModuleConfig modules[NUM_MODULES];
  FeederConfig feeder;
};

// Factory defaults — keep in sync with the moduleConfig/feederConfig
// initializers above; resetConfig restores these.
void setFactoryDefaults() {
  ModuleConfig factoryModules[NUM_MODULES] = {
    {150, 307, 150, 307, 150, 307, 460},
    {150, 307, 150, 307, 150, 307, 460},
    {150, 307, 150, 307, 150, 307, 460},
  };
  memcpy(moduleConfig, factoryModules, sizeof(moduleConfig));
  feederConfig.speed = 400;
  feederConfig.duration = 3000;
  feederConfig.pulseDuration = 0;
  feederConfig.pauseDuration = 50;
  feederConfig.settleDuration = 150;
}

void loadCalibration() {
  PersistedCalibration stored;
  EEPROM.get(CONFIG_EEPROM_ADDR, stored);
  if (stored.magic == CONFIG_MAGIC && stored.version == CONFIG_VERSION) {
    memcpy(moduleConfig, stored.modules, sizeof(moduleConfig));
    feederConfig = stored.feeder;
  }
}

void saveCalibration() {
  PersistedCalibration data;
  data.magic = CONFIG_MAGIC;
  data.version = CONFIG_VERSION;
  memcpy(data.modules, moduleConfig, sizeof(moduleConfig));
  data.feeder = feederConfig;
  EEPROM.put(CONFIG_EEPROM_ADDR, data);
}

// Routing delays (ms) — tune to match your hardware timing
#define DELAY_CARD_ENTER   300  // time for card to settle after target bottom opens
#define DELAY_PADDLE       300  // time for paddle to engage
#define DELAY_PUSH         600  // time for pusher to complete its stroke

// Fixed-size serial line buffer — avoids String heap fragmentation on long
// sessions. Oversized lines are discarded cleanly.
#define INPUT_BUFFER_MAX 256
char inputBuffer[INPUT_BUFFER_MAX + 1];
int inputBufferLen = 0;

// Request/response correlation. A command may carry an optional numeric "id";
// every reply to that command then echoes it, so the web app can match
// responses to requests even while the firmware emits asynchronous messages
// (e.g. the jam alert) in between. Messages that are NOT replies to a command
// (boot "ready", jam alerts) intentionally never carry an id.
int g_cmdId = 0;
bool g_hasCmdId = false;

void replyJson(JsonDocument& res) {
  if (g_hasCmdId) res["id"] = g_cmdId;
  serializeJson(res, Serial);
  Serial.println();
}

void replyLiteral(const char* json) {
  if (!g_hasCmdId) {
    Serial.println(json);
    return;
  }
  JsonDocument res;
  deserializeJson(res, json);
  res["id"] = g_cmdId;
  serializeJson(res, Serial);
  Serial.println();
}

int getChannel(int module, int servoOffset) {
  return MODULE_CHANNEL_OFFSET + (module - 1) * 3 + servoOffset;
}

void setServoPosition(int channel, int pulse) {
  pwm.setPWM(channel, 0, constrain(pulse, 120, 490));
}

void setModuleNeutral(int module) {
  ModuleConfig& c = moduleConfig[module - 1];
  setServoPosition(getChannel(module, 0), c.bottomClosed);
  setServoPosition(getChannel(module, 1), c.paddleClosed);
  setServoPosition(getChannel(module, 2), c.pusherNeutral);
}

void setAllNeutral() {
  for (int m = 1; m <= NUM_MODULES; m++) setModuleNeutral(m);
  stopFeeder();
}

void stopFeeder() {
  pwm.setPin(FEEDER_CHANNEL, 0);  // cut PWM signal entirely to stop 360° servo
}

// Idle-time jam watch — one entry per module index (1..NUM_MODULES; see
// checkModuleJams()).
void checkModuleJams() {
  for (int m = 1; m <= NUM_MODULES; m++) {
    bool present = digitalRead(irPin(m)) == LOW;
    if (!present) {
      modulePresentSince[m] = 0;
      moduleJamAlerted[m] = false;
      continue;
    }
    if (modulePresentSince[m] == 0) {
      modulePresentSince[m] = millis();
      continue;
    }
    if (!moduleJamAlerted[m] && millis() - modulePresentSince[m] > JAM_TIMEOUT_MS) {
      moduleJamAlerted[m] = true;
      jamAbortRequested = true;
      JsonDocument res;
      res["error"] = "jam";
      res["module"] = m;
      serializeJson(res, Serial);  // async — deliberately no command id
      Serial.println();
    }
  }
}

int getPositionPulse(int module, int servoOffset, const char* position) {
  ModuleConfig& c = moduleConfig[module - 1];
  if (servoOffset == 0) {
    if (strcmp(position, "open") == 0)   return c.bottomOpen;
    return c.bottomClosed;
  }
  if (servoOffset == 1) {
    if (strcmp(position, "open") == 0)   return c.paddleOpen;
    return c.paddleClosed;
  }
  if (servoOffset == 2) {
    if (strcmp(position, "left") == 0)   return c.pusherLeft;
    if (strcmp(position, "right") == 0)  return c.pusherRight;
    return c.pusherNeutral;
  }
  return -1;
}

int getServoOffset(const char* servo) {
  if (strcmp(servo, "bottom") == 0) return 0;
  if (strcmp(servo, "paddle") == 0) return 1;
  if (strcmp(servo, "pusher") == 0) return 2;
  return -1;
}

// ─── Operation machine: start helpers ────────────────────────────────────────

void clearOp() {
  op.kind = OP_NONE;
  op.phase = PH_NONE;
}

void beginOp(OpKind kind, unsigned long budgetMs) {
  op.kind = kind;
  op.phase = PH_NONE;
  op.bin = 0;
  op.waitModule = 0;
  op.pushLeft = false;
  op.holdMs = 0;
  op.ledIndex = 1;
  op.deadline = millis() + budgetMs;
  op.replyId = g_cmdId;
  op.hasReplyId = g_hasCmdId;
  cancelRequested = false;
  jamAbortRequested = false;
}

// Reply to the command that started the op (not the most recent command — a
// ping could have arrived mid-operation).
void replyOpJson(JsonDocument& res) {
  if (op.hasReplyId) res["id"] = op.replyId;
  serializeJson(res, Serial);
  Serial.println();
}

void finishOpOkRouted() {
  JsonDocument res;
  res["status"] = "routed";
  res["bin"] = op.bin;
  replyOpJson(res);
  clearOp();
}

void finishFeedDetected() {
  JsonDocument res;
  res["status"] = "ok";
  res["detected"] = true;
  res["empty"] = false;
  replyOpJson(res);
  clearOp();
}

void finishFeedEmpty() {
  JsonDocument res;
  res["error"] = "empty: feeder hopper is out of cards";
  res["empty"] = true;
  replyOpJson(res);
  clearOp();
}

void finishOpError(const char* msg) {
  JsonDocument res;
  res["error"] = msg;
  replyOpJson(res);
  clearOp();
}

void finishOpAborted(const char* msg) {
  JsonDocument res;
  res["error"] = msg;
  res["aborted"] = true;
  replyOpJson(res);
  clearOp();
}

void finishTestComplete() {
  JsonDocument res;
  res["status"] = "test_complete";
  replyOpJson(res);
  clearOp();
}

void finishCleared() {
  JsonDocument res;
  res["status"] = "cleared";
  replyOpJson(res);
  clearOp();
}

// Branch after the card has been fed into module 1 — per-bin routing plan.
void afterFeedDone() {
  if (op.kind == OP_FEED) {
    finishFeedDetected();
    return;
  }
  int bin = op.bin;
  if (bin == 7) {
    // Catch-all: open every bottom so the card drops to the catch-all position.
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    op.phase = PH_HOLD;
    op.holdMs = DELAY_PUSH;
  } else if (bin == 1 || bin == 2) {
    // Module 1: open paddle, then push.
    op.pushLeft = (bin == 1);
    op.waitModule = 1;
    op.phase = PH_PADDLE;
    setServoPosition(getChannel(1, 1), moduleConfig[0].paddleOpen);
  } else {
    // Bins 3-6: open module 1 bottom and await the card at the next module.
    op.pushLeft = (bin == 3 || bin == 5);
    op.waitModule = 2;
    op.phase = PH_WAIT_SENSOR;
    setServoPosition(getChannel(1, 0), moduleConfig[0].bottomOpen);
  }
  op.phaseStart = millis();
}

void beginRoute(int bin) {
  beginOp(OP_ROUTE, 20000);
  op.bin = bin;
  if (digitalRead(irPin(1)) == LOW) { afterFeedDone(); return; }  // card already there
  if (!hopperHasCards()) { finishOpError("empty: feeder hopper is out of cards"); return; }
  g_m1CardSeen = false;
  op.phase = PH_FEED_RUN;
  op.phaseStart = millis();
}

void beginFeed() {
  beginOp(OP_FEED, 15000);
  if (digitalRead(irPin(1)) == LOW) { finishFeedDetected(); return; }
  if (!hopperHasCards()) { finishFeedEmpty(); return; }
  g_m1CardSeen = false;
  op.phase = PH_FEED_RUN;
  op.phaseStart = millis();
}

void beginTest() {
  beginOp(OP_TEST, 30000);
  for (int m = 1; m <= NUM_MODULES; m++) {
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    setServoPosition(getChannel(m, 1), moduleConfig[m - 1].paddleOpen);
  }
  op.phase = PH_TEST_OPEN;
  op.phaseStart = millis();
}

void beginClear() {
  beginOp(OP_CLEAR, 10000);
  for (int m = 1; m <= NUM_MODULES; m++) {
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
  }
  op.phase = PH_CLEAR_OPEN;
  op.phaseStart = millis();
}

// ─── Operation machine: run from loop() ──────────────────────────────────────
void runMachine() {
  if (op.kind == OP_NONE) {
    checkModuleJams();
    return;
  }

  unsigned long now = millis();

  if (cancelRequested) {
    cancelRequested = false;
    setAllNeutral();
    finishOpAborted("cancelled");
    return;
  }
  if (jamAbortRequested) {
    jamAbortRequested = false;
    setAllNeutral();
    finishOpAborted("aborted: jam detected");
    return;
  }
  if (now > op.deadline) {
    setAllNeutral();
    finishOpError("timeout: operation exceeded its budget");
    return;
  }

  switch (op.phase) {
    case PH_FEED_RUN: {
      // Motor runs continuously; the interrupt flag stops it the moment the
      // module-1 beam is crossed (no pulse/pause cycling, no polling delay).
      setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
      if (g_m1CardSeen) {
        g_m1CardSeen = false;
        if (hopperHasCards()) {
          // Cards behind it push this one the rest of the way — stop now.
          stopFeeder();
          afterFeedDone();
        } else {
          // Last card: keep pushing for settleDuration so it seats fully.
          op.phase = PH_FEED_SETTLE;
          op.phaseStart = now;
        }
      } else if (now - op.phaseStart > (unsigned long)feederConfig.duration) {
        stopFeeder();
        finishOpError("timeout: feeder did not deliver card to module 1");
      }
      break;
    }
    case PH_FEED_SETTLE: {
      if (now - op.phaseStart >= (unsigned long)feederConfig.settleDuration) {
        stopFeeder();
        afterFeedDone();
      }
      break;
    }
    case PH_WAIT_SENSOR: {
      if (digitalRead(irPin(op.waitModule)) == LOW) {
        if (op.bin >= 5 && op.waitModule == 2) {
          // Bins 5/6: card at module 2 — open module 2's bottom, await module 3.
          setServoPosition(getChannel(2, 0), moduleConfig[1].bottomOpen);
          op.waitModule = 3;
          op.phaseStart = now;
        } else {
          op.phase = PH_CARD_ENTER;
          op.phaseStart = now;
        }
      } else if (now - op.phaseStart > IR_TIMEOUT_MS) {
        char msg[48];
        snprintf(msg, sizeof(msg), "timeout: no card detected at module %d", op.waitModule);
        setAllNeutral();
        finishOpError(msg);
      }
      break;
    }
    case PH_CARD_ENTER: {
      if (now - op.phaseStart >= DELAY_CARD_ENTER) {
        op.phase = PH_PADDLE;
        op.phaseStart = now;
        setServoPosition(
          getChannel(op.waitModule, 1),
          moduleConfig[op.waitModule - 1].paddleOpen);
      }
      break;
    }
    case PH_PADDLE: {
      if (now - op.phaseStart >= DELAY_PADDLE) {
        op.phase = PH_PUSH;
        op.phaseStart = now;
        setServoPosition(
          getChannel(op.waitModule, 2),
          op.pushLeft ? moduleConfig[op.waitModule - 1].pusherLeft
                      : moduleConfig[op.waitModule - 1].pusherRight);
      }
      break;
    }
    case PH_PUSH: {
      if (now - op.phaseStart >= DELAY_PUSH) {
        op.phase = PH_NEUTRAL;
        op.phaseStart = now;
        setAllNeutral();
      }
      break;
    }
    case PH_NEUTRAL: {
      if (now - op.phaseStart >= 200) {
        if (op.kind == OP_ROUTE) finishOpOkRouted();
        else if (op.kind == OP_TEST) finishTestComplete();
        else if (op.kind == OP_CLEAR) finishCleared();
        else finishOpError("internal error");
      }
      break;
    }
    case PH_HOLD: {
      if (now - op.phaseStart >= op.holdMs) {
        op.phase = PH_NEUTRAL;
        op.phaseStart = now;
        setAllNeutral();
      }
      break;
    }
    case PH_TEST_OPEN: {
      if (now - op.phaseStart >= DELAY_PUSH) {
        op.phase = PH_TEST_LEFT;
        op.phaseStart = now;
        for (int m = 1; m <= NUM_MODULES; m++) {
          setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherLeft);
        }
      }
      break;
    }
    case PH_TEST_LEFT: {
      if (now - op.phaseStart >= DELAY_PUSH) {
        op.phase = PH_TEST_RIGHT;
        op.phaseStart = now;
        for (int m = 1; m <= NUM_MODULES; m++) {
          setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherRight);
        }
      }
      break;
    }
    case PH_TEST_RIGHT: {
      if (now - op.phaseStart >= DELAY_PUSH) {
        setAllNeutral();
        op.phase = PH_TEST_FEED;
        op.phaseStart = now;
        setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
      }
      break;
    }
    case PH_TEST_FEED: {
      if (now - op.phaseStart >= 500) {
        stopFeeder();
        op.ledIndex = 1;
        pwm.setPin(0, 4095);  // LED 1 (ch0) on
        op.phase = PH_TEST_LED_ON;
        op.phaseStart = now;
      }
      break;
    }
    case PH_TEST_LED_ON: {
      if (now - op.phaseStart >= 150) {
        pwm.setPin(op.ledIndex - 1, 0);
        op.phase = PH_TEST_LED_OFF;
        op.phaseStart = now;
      }
      break;
    }
    case PH_TEST_LED_OFF: {
      if (now - op.phaseStart >= 100) {
        if (op.ledIndex < 4) {
          op.ledIndex++;
          pwm.setPin(op.ledIndex - 1, 4095);
          op.phase = PH_TEST_LED_ON;
          op.phaseStart = now;
        } else {
          op.phase = PH_NEUTRAL;
          op.phaseStart = now;
        }
      }
      break;
    }
    case PH_CLEAR_OPEN: {
      if (now - op.phaseStart >= DELAY_PUSH) {
        op.phase = PH_NEUTRAL;
        op.phaseStart = now;
        setAllNeutral();
      }
      break;
    }
    default:
      clearOp();  // unknown/unsupported phase — never wedge the machine
      break;
  }
}

void handleCommand(const char* json) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    Serial.print(F("{\"error\":\"invalid JSON\",\"reason\":\""));
    Serial.print(err.c_str());
    Serial.print(F("\",\"length\":"));
    Serial.print(strlen(json));
    Serial.print(F(",\"received\":\""));
    printJsonEscaped(json);
    Serial.println(F("\"}"));
    return;
  }

  // Optional numeric "id" — echoed on every reply to this command so the web
  // app can correlate the response (see replyJson/replyLiteral).
  g_cmdId = doc["id"] | 0;
  g_hasCmdId = doc["id"].is<int>();

  // {"cancel": true} — abort the active operation back to neutral at the next
  // loop() tick. Allowed even while busy.
  if (doc["cancel"].is<bool>() && doc["cancel"].as<bool>()) {
    if (op.kind != OP_NONE) cancelRequested = true;
    replyLiteral("{\"status\":\"cancelled\"}");
    return;
  }

  // While an operation is running, most commands would fight the machine (a
  // servo move mid-route physically yanks a servo). Diagnostics that don't
  // move the mechanism are still served.
  if (op.kind != OP_NONE) {
    if (doc["ping"].is<bool>() && doc["ping"].as<bool>()) {
      replyLiteral("{\"status\":\"pong\"}");
      return;
    }
    if (doc["led"].is<int>()) {
      int led = doc["led"].as<int>();
      if (led < 1 || led > 5) {
        replyLiteral("{\"error\":\"led must be 1 to 5\"}");
        return;
      }
      bool on = doc["on"] | false;
      int channel = led <= 4 ? led - 1 : 14;
      pwm.setPin(channel, on ? 4095 : 0);
      JsonDocument res;
      res["status"] = "ok";
      res["led"] = led;
      res["on"] = on;
      replyJson(res);
      return;
    }
    if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
      JsonDocument res;
      res["status"] = "ok";
      JsonArray ir = res["ir"].to<JsonArray>();
      for (int m = 1; m <= NUM_MODULES; m++) {
        ir.add(digitalRead(irPin(m)) == LOW);
      }
      res["hopper"] = hopperHasCards();
      replyJson(res);
      return;
    }
    replyLiteral("{\"error\":\"busy\"}");
    return;
  }

  // Re-arm the jam abort for this command (a jam alert during the previous
  // one must not abort this one before it even starts).
  jamAbortRequested = false;

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    beginTest();
    return;
  }

  // {"ping": true} — liveness check; the web app uses this as a heartbeat
  if (doc["ping"].is<bool>() && doc["ping"].as<bool>()) {
    replyLiteral("{\"status\":\"pong\"}");
    return;
  }

  // {"neutral": true} — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    replyLiteral("{\"status\":\"ok\"}");
    return;
  }

  // {"clearDevice": true} — opens every module's bottom trapdoor at once so
  // any card resting in the mechanism drops through to the catch-all area,
  // then returns everything to neutral. Unlike bin 7 routing, this doesn't
  // run the feeder first - it's meant to flush out whatever's physically
  // stuck regardless of feeder/hopper state.
  if (doc["clearDevice"].is<bool>() && doc["clearDevice"].as<bool>()) {
    beginClear();
    return;
  }

  // {"led": 1, "on": true} — control LED by position (1..4) or the scan light (5)
  if (doc["led"].is<int>()) {
    int led = doc["led"].as<int>();
    if (led < 1 || led > 5) {
      replyLiteral("{\"error\":\"led must be 1 to 5\"}");
      return;
    }
    bool on = doc["on"] | false;
    // LEDs 1-4 live on ch0-3; the scan light is LED 5 on spare ch14.
    int channel = led <= 4 ? led - 1 : 14;
    pwm.setPin(channel, on ? 4095 : 0);

    JsonDocument res;
    res["status"] = "ok";
    res["led"] = led;
    res["on"] = on;
    replyJson(res);
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      replyLiteral("{\"error\":\"module must be 1-3\"}");
      return;
    }
    int offset = getServoOffset(servo);
    if (offset < 0) {
      replyLiteral("{\"error\":\"servo must be bottom, paddle, or pusher\"}");
      return;
    }
    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      pulse = getPositionPulse(module, offset, doc["position"] | "neutral");
      if (pulse < 0) {
        replyLiteral("{\"error\":\"invalid position\"}");
        return;
      }
    }
    setServoPosition(getChannel(module, offset), pulse);
    delay(200);

    JsonDocument res;
    res["status"] = "ok";
    res["servo"] = servo;
    res["module"] = module;
    replyJson(res);
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObject cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      replyLiteral("{\"error\":\"module must be 1-3\"}");
      return;
    }
    ModuleConfig& c = moduleConfig[module - 1];
    c.bottomClosed  = cfg["bottomClosed"]  | c.bottomClosed;
    c.bottomOpen    = cfg["bottomOpen"]    | c.bottomOpen;
    c.paddleClosed  = cfg["paddleClosed"]  | c.paddleClosed;
    c.paddleOpen    = cfg["paddleOpen"]    | c.paddleOpen;
    c.pusherLeft    = cfg["pusherLeft"]    | c.pusherLeft;
    c.pusherNeutral = cfg["pusherNeutral"] | c.pusherNeutral;
    c.pusherRight   = cfg["pusherRight"]   | c.pusherRight;
    saveCalibration();  // persist so a reboot keeps the tuned values

    JsonDocument res;
    res["status"] = "ok";
    res["module"] = module;
    replyJson(res);
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    beginFeed();
    return;
  }

  // {"feederValue": N} — set raw PWM (for calibration preview, does not auto-stop)
  if (doc["feederValue"].is<int>()) {
    setServoPosition(FEEDER_CHANNEL, doc["feederValue"].as<int>());
    JsonDocument res;
    res["status"] = "ok";
    replyJson(res);
    return;
  }

  // {"feederStop": true} — stop feeder immediately
  if (doc["feederStop"].is<bool>() && doc["feederStop"].as<bool>()) {
    stopFeeder();
    JsonDocument res;
    res["status"] = "ok";
    replyJson(res);
    return;
  }

  // {"setFeederConfig": {"speed": N, "duration": N, "pulseDuration": N, "pauseDuration": N, "settleDuration": N}}
  if (!doc["setFeederConfig"].isNull()) {
    JsonObject cfg = doc["setFeederConfig"];
    feederConfig.speed          = cfg["speed"]          | feederConfig.speed;
    feederConfig.duration       = cfg["duration"]       | feederConfig.duration;
    feederConfig.pulseDuration  = cfg["pulseDuration"]  | feederConfig.pulseDuration;
    feederConfig.pauseDuration  = cfg["pauseDuration"]  | feederConfig.pauseDuration;
    feederConfig.settleDuration = cfg["settleDuration"] | feederConfig.settleDuration;
    stopFeeder();
    saveCalibration();  // persist so a reboot keeps the tuned values
    JsonDocument res;
    res["status"] = "ok";
    replyJson(res);
    return;
  }

  // {"saveConfig": true} — persist current module + feeder config to EEPROM
  if (doc["saveConfig"].is<bool>() && doc["saveConfig"].as<bool>()) {
    saveCalibration();
    replyLiteral("{\"status\":\"saved\"}");
    return;
  }

  // {"resetConfig": true} — restore factory defaults in RAM and EEPROM
  if (doc["resetConfig"].is<bool>() && doc["resetConfig"].as<bool>()) {
    setFactoryDefaults();
    saveCalibration();
    setAllNeutral();
    replyLiteral("{\"status\":\"reset\"}");
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    Serial.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= NUM_MODULES; m++) {
      if (m > 1) Serial.print(',');
      Serial.print(digitalRead(irPin(m)) == LOW ? F("true") : F("false"));  // true = card present
    }
    res["hopper"] = hopperHasCards();  // true = cards remain in feeder stack
    replyJson(res);
    return;
  }

  // {"bin": N} — route the next card to bin N (1–7)
  if (doc["bin"].is<int>()) {
    int bin = doc["bin"].as<int>();
    if (bin < 1 || bin > 7) {
      replyLiteral("{\"error\":\"bin must be 1-7\"}");
      return;
    }
    beginRoute(bin);
    return;
  }

  replyLiteral("{\"error\":\"unknown command\"}");
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  loadCalibration();  // restore tuned config before any servo moves

  // IR sensors: active LOW (internal pull-up, sensor pulls LOW when card present)
  pinMode(IR_PIN_MODULE1, INPUT_PULLUP);
  pinMode(IR_PIN_MODULE2, INPUT_PULLUP);
  pinMode(IR_PIN_MODULE3, INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);

  // Interrupt-driven module-1 detection: the feeder stops the instant the beam
  // is crossed, no polling. Module 2/3 sensors stay polled (they gate routing
  // waits, where a few ms of latency is fine).
  attachInterrupt(digitalPinToInterrupt(IR_PIN_MODULE1), onModule1IR, CHANGE);

  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.println("{\"status\":\"ready\",\"proto\":2}");

  // Report cards already resting at a module gate on boot (e.g. power loss
  // mid-run) so the operator can clear the device before the first feed.
  for (int m = 1; m <= NUM_MODULES; m++) {
    if (digitalRead(irPin(m)) == LOW) {
      JsonDocument res;
      res["error"] = "recovered";
      res["module"] = m;
      serializeJson(res, Serial);
      Serial.println();
    }
  }
}

void loop() {
  // Serial stays responsive during operations: the machine below runs on its
  // own timers/sensors, so commands are always serviced.
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBufferLen > 0) {
        inputBuffer[inputBufferLen] = '\0';
        handleCommand(inputBuffer);
        inputBufferLen = 0;
      }
    } else if (inputBufferLen < INPUT_BUFFER_MAX) {
      inputBuffer[inputBufferLen++] = c;
    } else {
      inputBufferLen = 0;  // oversized line — discard
      Serial.println("{\"error\":\"line too long\"}");
    }
  }

  runMachine();
}
