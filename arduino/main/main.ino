#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <EEPROM.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// PWM channel layout (PCA9685):
//   ch0    = LED 1 — scan light (angled holo-detection light, toggled by the
//            web app for two-frame foil scans)
//   ch1    = LED 2 — green “operating” indicator
//   ch2    = LED 3 — red “machine fault” indicator (jam / timeout)
//   ch3    = LED 4 — orange “software/comms fault” indicator
//   ch4-6   = Module 1 (bottom, paddle, pusher)
//   ch7-9   = Module 2
//   ch10-12 = Module 3
//   ch13    = Feeder (360° continuous rotation servo)
//   ch14-15 = Spare
#define NUM_MODULES 3
#define MODULE_CHANNEL_OFFSET 4
#define FEEDER_CHANNEL 13

// IR sensor pins — one per module (active LOW: pin reads LOW when card is present)
#define IR_PIN_MODULE1 2
#define IR_PIN_MODULE2 3
#define IR_PIN_MODULE3 4
#define IR_TIMEOUT_MS  3000  // max ms to wait for a card before aborting

// Module 1 is where every card lands right after feeding, before any routing
// decision is made — if it sits there this long with no routing command in
// progress (e.g. the app never sent a bin command), something's stuck.
#define MODULE1_JAM_TIMEOUT_MS 20000

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
  {300, 310, 300, 310, 295, 300, 305},
  {300, 310, 300, 310, 295, 300, 305},
  {300, 310, 300, 310, 295, 300, 305},
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

FeederConfig feederConfig = {315, 1000, 40, 100, 100};

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
  feederConfig.pulseDuration = 80;
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

#define MAX_CMD_LEN 200
char inputBuffer[MAX_CMD_LEN + 1];
uint8_t inputLen = 0;
bool inputOverflowed = false;

// Idle-time jam watch for module 1 — see checkModule1Jam().
unsigned long module1PresentSince = 0;
bool module1JamAlerted = false;

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

// Watches module 1's IR sensor while idle (only runs between commands, since
// routeCard()/runFeeder() block loop() for their duration). If a card has
// been sitting there continuously longer than MODULE1_JAM_TIMEOUT_MS — e.g.
// the app never followed up with a bin command — report it once so it isn't
// silently left for the operator to discover. Clears itself (and re-arms)
// as soon as the sensor sees the card leave.
void checkModule1Jam() {
  bool present = digitalRead(IR_PIN_MODULE1) == LOW;
  if (!present) {
    module1PresentSince = 0;
    module1JamAlerted = false;
    return;
  }
  if (module1PresentSince == 0) {
    module1PresentSince = millis();
    return;
  }
  if (!module1JamAlerted && millis() - module1PresentSince > MODULE1_JAM_TIMEOUT_MS) {
    module1JamAlerted = true;
    Serial.println(F("{\"error\":\"jam\",\"module\":1}"));
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
    Serial.println(F("{\"error\":\"bin must be 1-7\"}"));
    return;
  }

  // Run feeder until module 1 IR detects the card (or timeout/empty hopper)
  FeedResult feedResult = runFeeder();
  if (feedResult != FEED_DETECTED) {
    Serial.print(F("{\"error\":\""));
    Serial.print(feedResult == FEED_EMPTY
      ? F("empty: feeder hopper is out of cards")
      : F("timeout: feeder did not deliver card to module 1"));
    Serial.print(F("\",\"empty\":"));
    Serial.print(feedResult == FEED_EMPTY ? F("true") : F("false"));
    Serial.println(F("}"));
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
      Serial.println(F("{\"error\":\"timeout: no card detected at module 2\"}"));
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
      Serial.println(F("{\"error\":\"timeout: no card detected at module 2\"}"));
      setAllNeutral();
      return;
    }
    setServoPosition(getChannel(2, 0), moduleConfig[1].bottomOpen);

    if (!waitForCard(3)) {
      Serial.println(F("{\"error\":\"timeout: no card detected at module 3\"}"));
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

  Serial.print(F("{\"status\":\"routed\",\"bin\":"));
  Serial.print(bin);
  Serial.println(F("}"));
}

void printJsonEscaped(const char* s) {
  for (const char* p = s; *p; p++) {
    char c = *p;
    if (c == '"' || c == '\\') {
      Serial.write('\\');
      Serial.write(c);
    } else if (c == '\n') {
      Serial.print(F("\\n"));
    } else if (c == '\r') {
      Serial.print(F("\\r"));
    } else if ((unsigned char)c >= 0x20) {
      Serial.write(c);
    }
  }
}

void handleCommand(char* json) {
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

    Serial.println(F("{\"status\":\"test_complete\"}"));
    return;
  }

  // {"neutral": true} — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    Serial.println(F("{\"status\":\"ok\"}"));
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
    Serial.println(F("{\"status\":\"cleared\"}"));
    return;
  }

  // {"led": 1, "on": true} — control the LEDs on channels 0-3. LED 1 is the
  // scan light; LEDs 2-4 are spare indicator lamps.
  if (doc["led"].is<int>()) {
    int led = doc["led"].as<int>();
    if (led < 1 || led > 4) {
      Serial.println(F("{\"error\":\"led must be 1 to 4\"}"));
      return;
    }
    bool on = doc["on"] | false;
    // LEDs live on channels 0-3; there is no spare-channel LED 5 anymore.
    int channel = led - 1;
    pwm.setPin(channel, on ? 4095 : 0);

    Serial.print(F("{\"status\":\"ok\",\"led\":"));
    Serial.print(led);
    Serial.print(F(",\"on\":"));
    Serial.print(on ? F("true") : F("false"));
    Serial.println(F("}"));
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      Serial.println(F("{\"error\":\"module must be 1-3\"}"));
      return;
    }
    int offset = getServoOffset(servo);
    if (offset < 0) {
      Serial.println(F("{\"error\":\"servo must be bottom, paddle, or pusher\"}"));
      return;
    }
    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      pulse = getPositionPulse(module, offset, doc["position"] | "neutral");
      if (pulse < 0) {
        Serial.println(F("{\"error\":\"invalid position\"}"));
        return;
      }
    }
    setServoPosition(getChannel(module, offset), pulse);
    delay(200);

    Serial.print(F("{\"status\":\"ok\",\"servo\":\""));
    Serial.print(servo);
    Serial.print(F("\",\"module\":"));
    Serial.print(module);
    Serial.println(F("}"));
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObject cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      Serial.println(F("{\"error\":\"module must be 1-3\"}"));
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

    Serial.print(F("{\"status\":\"ok\",\"module\":"));
    Serial.print(module);
    Serial.println(F("}"));
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    FeedResult result = runFeeder();
    Serial.print(F("{\"status\":\"ok\",\"detected\":"));
    Serial.print(result == FEED_DETECTED ? F("true") : F("false"));
    Serial.print(F(",\"empty\":"));
    Serial.print(result == FEED_EMPTY ? F("true") : F("false"));
    Serial.println(F("}"));
    return;
  }

  // {"feederValue": N} — set raw PWM (for calibration preview, does not auto-stop)
  if (doc["feederValue"].is<int>()) {
    setServoPosition(FEEDER_CHANNEL, doc["feederValue"].as<int>());
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"feederStop": true} — stop feeder immediately
  if (doc["feederStop"].is<bool>() && doc["feederStop"].as<bool>()) {
    stopFeeder();
    Serial.println(F("{\"status\":\"ok\"}"));
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
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"saveConfig": true} — persist current module + feeder config to EEPROM
  if (doc["saveConfig"].is<bool>() && doc["saveConfig"].as<bool>()) {
    saveCalibration();
    Serial.println("{\"status\":\"saved\"}");
    return;
  }

  // {"resetConfig": true} — restore factory defaults in RAM and EEPROM
  if (doc["resetConfig"].is<bool>() && doc["resetConfig"].as<bool>()) {
    setFactoryDefaults();
    saveCalibration();
    setAllNeutral();
    Serial.println("{\"status\":\"reset\"}");
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    Serial.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= NUM_MODULES; m++) {
      if (m > 1) Serial.print(',');
      Serial.print(digitalRead(irPin(m)) == LOW ? F("true") : F("false"));  // true = card present
    }
    Serial.print(F("],\"hopper\":"));
    Serial.print(hopperHasCards() ? F("true") : F("false"));  // true = cards remain in feeder stack
    Serial.println(F("}"));
    return;
  }

  // {"bin": N} — route the next card to bin N (1–7)
  if (doc["bin"].is<int>()) {
    routeCard(doc["bin"].as<int>());
    return;
  }

  Serial.println(F("{\"error\":\"unknown command\"}"));
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

  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.println(F("{\"status\":\"ready\"}"));
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputOverflowed) {
        Serial.println(F("{\"error\":\"command too long\"}"));
        inputOverflowed = false;
      } else if (inputLen > 0) {
        inputBuffer[inputLen] = '\0';
        handleCommand(inputBuffer);
      }
      inputLen = 0;
    } else if (!inputOverflowed) {
      if (inputLen < MAX_CMD_LEN) {
        inputBuffer[inputLen++] = c;
      } else {
        inputOverflowed = true;
        inputLen = 0;
      }
    }
  }
  checkModule1Jam();
}
