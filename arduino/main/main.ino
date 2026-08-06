#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// PWM channel layout (PCA9685):
//   ch0-3   = LEDs (1-indexed: LED 1 = ch0 ... LED 4 = ch3)
//   ch4-6   = Module 1 (bottom, paddle, pusher)
//   ch7-9   = Module 2
//   ch10-12 = Module 3
//   ch13    = Feeder (360° continuous rotation servo)
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
// reported as a jam. Only checked while idle (loop()).
#define JAM_TIMEOUT_MS 20000

// Hopper IR sensor — active LOW: pin reads LOW while cards remain in the feeder stack
#define IR_PIN_HOPPER 5

// Declared here (before any function) because the Arduino builder hoists
// auto-generated function prototypes to the top of the file, above any type
// defined later — if FeedResult were declared next to runFeeder() instead,
// the hoisted `FeedResult runFeeder();` prototype would precede it and fail
// to compile ("FeedResult does not name a type").
enum FeedResult { FEED_DETECTED, FEED_TIMEOUT, FEED_EMPTY };

int irPin(int module) {
  if (module == 1) return IR_PIN_MODULE1;
  if (module == 2) return IR_PIN_MODULE2;
  return IR_PIN_MODULE3;
}

bool hopperHasCards() {
  return digitalRead(IR_PIN_HOPPER) == LOW;
}

// Returns true when the IR sensor at 'module' detects a card within timeoutMs.
bool waitForCard(int module, int timeoutMs = IR_TIMEOUT_MS) {
  unsigned long start = millis();
  while (digitalRead(irPin(module)) == HIGH) {
    if (millis() - start > (unsigned long)timeoutMs) return false;
    delay(5);
  }
  return true;
}

struct ModuleConfig {
  int bottomClosed, bottomOpen;
  int paddleClosed, paddleOpen;
  int pusherLeft, pusherNeutral, pusherRight;
};

ModuleConfig moduleConfig[NUM_MODULES] = {
  {150, 307, 150, 307, 150, 307, 460},
  {150, 307, 150, 307, 150, 307, 460},
  {150, 307, 150, 307, 150, 307, 460},
};

struct FeederConfig {
  int speed;          // PWM pulse for forward motion
  int duration;       // overall timeout (ms) — max total time before giving up
  int pulseDuration;  // ms to run the motor per pulse (0 = continuous feed, no pulsing)
  int pauseDuration;  // ms to pause between pulses (IR checked after each stop)
  int settleDuration; // ms to keep feeding after the IR first sees the card, so it
                       // travels all the way into the module 1 mechanism instead of
                       // stopping right at the sensor's beam
};

FeederConfig feederConfig = {400, 3000, 80, 50, 150};

// Routing delays (ms) — tune to match your hardware timing
#define DELAY_CARD_ENTER   300  // time for card to settle after target bottom opens
#define DELAY_PADDLE       300  // time for paddle to engage
#define DELAY_PUSH         600  // time for pusher to complete its stroke

// Fixed-size serial line buffer — avoids String heap fragmentation on long
// sessions. Oversized lines are discarded cleanly (and reported).
#define INPUT_BUFFER_MAX 256
char inputBuffer[INPUT_BUFFER_MAX + 1];
int inputBufferLen = 0;

// Request/response correlation. A command may carry an optional numeric "id";
// every reply to that command then echoes it, so the web app can match
// responses to requests even while the firmware emits asynchronous messages
// (e.g. a jam alert) in between. Messages that are NOT replies to a command
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

// Idle-time jam watch — one entry per module index (1..NUM_MODULES; see
// checkModuleJams()).
unsigned long modulePresentSince[NUM_MODULES + 1] = {0, 0, 0, 0};
bool moduleJamAlerted[NUM_MODULES + 1] = {false, false, false, false};

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

void stopFeeder() {
  pwm.setPin(FEEDER_CHANNEL, 0);  // cut PWM signal entirely to stop 360° servo
}

// Stops the feeder once the IR sees the card. Cards still behind it in the
// hopper push the current one the rest of the way into module 1, so no extra
// run time is needed. But the last card has nothing behind it to push it in —
// so if the hopper is now empty, keep the motor running for
// feederConfig.settleDuration more ms before stopping, to carry it the rest
// of the way into the mechanism.
void settleAndStopFeeder() {
  if (!hopperHasCards()) {
    delay(feederConfig.settleDuration);
  }
  stopFeeder();
}

// Runs the feeder in short pulses, checking module 1 IR between each stop.
// Keeps feeding (see settleAndStopFeeder) once a card is detected. Returns
// FEED_EMPTY only if there was nothing to feed AND no card already waiting
// at module 1 - once feeding is underway, the hopper going empty is normal
// (it just means this is the last card) and must NOT abort the feed; only
// the module 1 sensor or the overall feederConfig.duration timeout should
// stop it. If pulseDuration is 0, the motor runs continuously (no
// pulse/pause cycling) while IR is polled throughout.
//
// routeCard() calls this again as a presence check right before routing,
// after the card has already been fed. For the last card in the hopper,
// hopperHasCards() is false by then even though the card is sitting right
// at the sensor - so the module 1 check must come before the hopper check,
// or routeCard() wrongly reports the feeder empty instead of routing the
// card that's already there.
FeedResult runFeeder() {
  unsigned long start = millis();

  if (digitalRead(irPin(1)) == LOW) return FEED_DETECTED;

  if (!hopperHasCards()) return FEED_EMPTY;

  if (feederConfig.pulseDuration <= 0) {
    setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
    while (millis() - start < (unsigned long)feederConfig.duration) {
      if (digitalRead(irPin(1)) == LOW) {
        settleAndStopFeeder();
        return FEED_DETECTED;
      }
      delay(2);
    }
    stopFeeder();
    return FEED_TIMEOUT;
  }

  while (millis() - start < (unsigned long)feederConfig.duration) {
    // Check before starting the motor — catches cards that arrived during the pause
    if (digitalRead(irPin(1)) == LOW) return FEED_DETECTED;

    setServoPosition(FEEDER_CHANNEL, feederConfig.speed);

    // Poll IR mid-pulse so we catch the moment the card trips the sensor
    unsigned long pulseStart = millis();
    while (millis() - pulseStart < (unsigned long)feederConfig.pulseDuration) {
      if (digitalRead(irPin(1)) == LOW) {
        settleAndStopFeeder();
        return FEED_DETECTED;
      }
      delay(2);
    }

    stopFeeder();
    if (digitalRead(irPin(1)) == LOW) {
      // Card arrived during the pause window — motor's already off. Only the
      // last card (hopper now empty) needs an extra push to fully seat it.
      if (!hopperHasCards()) {
        setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
        delay(feederConfig.settleDuration);
        stopFeeder();
      }
      return FEED_DETECTED;
    }
    delay(feederConfig.pauseDuration);
  }
  return FEED_TIMEOUT;
}

// Watches every module's IR sensor while idle (only runs between commands,
// since routeCard()/runFeeder() block loop() for their duration). If a card
// has been sitting at a module's gate continuously longer than JAM_TIMEOUT_MS
// — e.g. the app never followed up with a bin command — report it once so it
// isn't silently left for the operator to discover. Clears itself (and
// re-arms) as soon as the sensor sees the card leave.
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
      JsonDocument res;
      res["error"] = "jam";
      res["module"] = m;
      serializeJson(res, Serial);  // async — deliberately no command id
      Serial.println();
    }
  }
}

void setAllNeutral() {
  for (int m = 1; m <= NUM_MODULES; m++) setModuleNeutral(m);
  stopFeeder();
  delay(200);
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

// Route a card to the given bin number (1–7).
//   Bin 1: wait for card at module 1, open paddle, push left
//   Bin 2: wait for card at module 1, open paddle, push right
//   Bin 3: wait for card at module 1, open bottom → wait for module 2, push left
//   Bin 4: wait for card at module 1, open bottom → wait for module 2, push right
//   Bin 5: wait for m1, open bottom → wait for m2, open bottom → wait for m3, push left
//   Bin 6: wait for m1, open bottom → wait for m2, open bottom → wait for m3, push right
//   Bin 7: wait for card at module 1, open all bottoms (catch-all)
void routeCard(int bin) {
  if (bin < 1 || bin > 7) {
    replyLiteral("{\"error\":\"bin must be 1-7\"}");
    return;
  }

  // Run feeder until module 1 IR detects the card (or timeout/empty hopper)
  FeedResult feedResult = runFeeder();
  if (feedResult != FEED_DETECTED) {
    JsonDocument res;
    res["error"] = feedResult == FEED_EMPTY
      ? "empty: feeder hopper is out of cards"
      : "timeout: feeder did not deliver card to module 1";
    res["empty"] = feedResult == FEED_EMPTY;
    replyJson(res);
    setAllNeutral();
    return;
  }

  if (bin == 7) {
    // Open all bottoms so card passes through to the catch-all position
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);

  } else if (bin <= 2) {
    // Module 1: open paddle, then push
    ModuleConfig& c = moduleConfig[0];
    setServoPosition(getChannel(1, 1), c.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(1, 2), bin == 1 ? c.pusherLeft : c.pusherRight);
    delay(DELAY_PUSH);
    setModuleNeutral(1);
    delay(200);

  } else if (bin <= 4) {
    // Open module 1 bottom and wait for card to arrive at module 2
    bool pushLeft = (bin == 3);
    setServoPosition(getChannel(1, 0), moduleConfig[0].bottomOpen);

    if (!waitForCard(2)) {
      replyLiteral("{\"error\":\"timeout: no card detected at module 2\"}");
      setAllNeutral();
      return;
    }
    delay(DELAY_CARD_ENTER);

    ModuleConfig& c2 = moduleConfig[1];
    setServoPosition(getChannel(2, 1), c2.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(2, 2), pushLeft ? c2.pusherLeft : c2.pusherRight);
    delay(DELAY_PUSH);
    setModuleNeutral(1);
    setModuleNeutral(2);
    delay(200);

  } else {
    // Open module 1 bottom and wait for card at module 2, then open module 2 bottom
    // and wait for card at module 3
    bool pushLeft = (bin == 5);
    setServoPosition(getChannel(1, 0), moduleConfig[0].bottomOpen);

    if (!waitForCard(2)) {
      replyLiteral("{\"error\":\"timeout: no card detected at module 2\"}");
      setAllNeutral();
      return;
    }
    setServoPosition(getChannel(2, 0), moduleConfig[1].bottomOpen);

    if (!waitForCard(3)) {
      replyLiteral("{\"error\":\"timeout: no card detected at module 3\"}");
      setAllNeutral();
      return;
    }
    delay(DELAY_CARD_ENTER);

    ModuleConfig& c3 = moduleConfig[2];
    setServoPosition(getChannel(3, 1), c3.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(3, 2), pushLeft ? c3.pusherLeft : c3.pusherRight);
    delay(DELAY_PUSH);
    setModuleNeutral(1);
    setModuleNeutral(2);
    setModuleNeutral(3);
    delay(200);
  }

  JsonDocument res;
  res["status"] = "routed";
  res["bin"]    = bin;
  replyJson(res);
}

void handleCommand(const char* json) {
  JsonDocument doc;
  if (deserializeJson(doc, json)) {
    replyLiteral("{\"error\":\"invalid JSON\"}");
    return;
  }

  // Optional numeric "id" — echoed on every reply to this command so the web
  // app can correlate the response (see replyJson/replyLiteral).
  g_cmdId = doc["id"] | 0;
  g_hasCmdId = doc["id"].is<int>();

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    // Open all bottoms and paddles
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
      setServoPosition(getChannel(m, 1), moduleConfig[m - 1].paddleOpen);
    }
    delay(DELAY_PUSH);

    // Move all pushers left
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherLeft);
    }
    delay(DELAY_PUSH);

    // Move all pushers right
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherRight);
    }
    delay(DELAY_PUSH);

    // Reset all servos
    setAllNeutral();
    delay(200);

    // Test feeder: spin briefly to verify motor movement (no card expected)
    setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
    delay(500);
    stopFeeder();
    delay(200);

    // Cycle through LEDs
    for (int led = 1; led <= 4; led++) {
      pwm.setPin(led - 1, 4095);
      delay(150);
      pwm.setPin(led - 1, 0);
      delay(100);
    }

    replyLiteral("{\"status\":\"test_complete\"}");
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
  // call runFeeder() first - it's meant to flush out whatever's physically
  // stuck regardless of feeder/hopper state.
  if (doc["clearDevice"].is<bool>() && doc["clearDevice"].as<bool>()) {
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);
    replyLiteral("{\"status\":\"cleared\"}");
    return;
  }

  // {"led": 1, "on": true} — control LED by position (1 or 2)
  if (doc["led"].is<int>()) {
    int led = doc["led"].as<int>();
    if (led < 1 || led > 4) {
      replyLiteral("{\"error\":\"led must be 1 to 4\"}");
      return;
    }
    bool on = doc["on"] | false;
    pwm.setPin(led - 1, on ? 4095 : 0);

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

    JsonDocument res;
    res["status"] = "ok";
    res["module"] = module;
    replyJson(res);
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    FeedResult result = runFeeder();
    JsonDocument res;
    res["status"] = "ok";
    res["detected"] = result == FEED_DETECTED;
    res["empty"] = result == FEED_EMPTY;
    replyJson(res);
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
    JsonDocument res;
    res["status"] = "ok";
    replyJson(res);
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    JsonDocument res;
    res["status"] = "ok";
    JsonArray ir = res["ir"].to<JsonArray>();
    for (int m = 1; m <= NUM_MODULES; m++) {
      ir.add(digitalRead(irPin(m)) == LOW);  // true = card present
    }
    res["hopper"] = hopperHasCards();  // true = cards remain in feeder stack
    replyJson(res);
    return;
  }

  // {"bin": N} — route the next card to bin N (1–7)
  if (doc["bin"].is<int>()) {
    routeCard(doc["bin"].as<int>());
    return;
  }

  replyLiteral("{\"error\":\"unknown command\"}");
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  // IR sensors: active LOW (internal pull-up, sensor pulls LOW when card present)
  pinMode(IR_PIN_MODULE1, INPUT_PULLUP);
  pinMode(IR_PIN_MODULE2, INPUT_PULLUP);
  pinMode(IR_PIN_MODULE3, INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);

  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.println("{\"status\":\"ready\"}");

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
  checkModuleJams();
}
