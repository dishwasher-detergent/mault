#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

#define FIRMWARE_VERSION "1.0.1"

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// PWM channel layout (PCA9685, 16 channels total, valid channels 0-15):
//   Each module uses 3 consecutive channels (bottom, paddle, pusher),
//   starting at moduleChannelOffset. The feeder (360° continuous rotation
//   servo) takes the next channel after the last addressable module.
//   e.g. offset=0: module1=ch0-2 ... module5=ch12-14, feeder=ch15.
//        offset=4: module1=ch4-6 ... module3=ch10-12, feeder=ch13.
//
// moduleChannelOffset is runtime-configurable (via {"setChannelOffset": N}),
// not a compile-time constant - the app sends it based on each org's
// "channel layout" setting:
//   0 ("standard") - current build docs/BOM, module 1 starts at channel 0.
//   4 ("legacy") - reserves channels 0-3 for the status LEDs driven by
//     firmware built before module expansion existed, so orgs with hardware
//     already wired that way don't need to rewire. Caps out at 3 modules
//     instead of 5 since the offset eats into the 16-channel budget.
// MAX_MODULES (below) only sizes compile-time arrays - it is NOT how many
// modules are actually addressable at any given offset; maxModuleForOffset()
// is. The app already knows each org's real module count and only ever
// sends {"route": ...} commands naming modules that exist, so channels
// beyond what's addressable for the current offset just sit idle.
#define MAX_MODULES 5
int moduleChannelOffset = 0;

// IR sensor pins — one per module (active LOW: pin reads LOW when card is present).
// Pins for modules beyond what's addressable at the current offset are simply never read.
const int IR_PINS[MAX_MODULES] = {2, 3, 4, 6, 7};
#define IR_TIMEOUT_MS  3000  // max ms to wait for a card before aborting

// Module 1 is where every card lands right after feeding, before any routing
// decision is made — if it sits there this long with no routing command in
// progress (e.g. the app never sent a route command), something's stuck.
#define MODULE1_JAM_TIMEOUT_MS 20000

// Hopper IR sensor — active LOW: pin reads LOW while cards remain in the feeder stack
#define IR_PIN_HOPPER 5

// Declared here (before any function - including maxModuleForOffset() right
// below) because the Arduino builder hoists auto-generated function
// prototypes to the top of the file, above any type defined later — if
// FeedResult were declared after the first function instead, the hoisted
// `FeedResult runFeeder();` prototype would precede it and fail to compile
// ("FeedResult does not name a type").
enum FeedResult { FEED_DETECTED, FEED_TIMEOUT, FEED_EMPTY };

// Largest module number whose 3 channels, plus one feeder channel right
// after the last addressable module, still fit in channels [offset, 15].
int maxModuleForOffset() {
  int n = (15 - moduleChannelOffset) / 3;
  return n < 0 ? 0 : n;
}

int irPin(int module) {
  return IR_PINS[module - 1];
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

ModuleConfig moduleConfig[MAX_MODULES];

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
  return moduleChannelOffset + (module - 1) * 3 + servoOffset;
}

int getFeederChannel() {
  return moduleChannelOffset + maxModuleForOffset() * 3;
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
  pwm.setPin(getFeederChannel(), 0);  // cut PWM signal entirely to stop 360° servo
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
    setServoPosition(getFeederChannel(), feederConfig.speed);
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

    setServoPosition(getFeederChannel(), feederConfig.speed);

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
        setServoPosition(getFeederChannel(), feederConfig.speed);
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
// the app never followed up with a route command — report it once so it isn't
// silently left for the operator to discover. Clears itself (and re-arms)
// as soon as the sensor sees the card leave.
void checkModule1Jam() {
  bool present = digitalRead(irPin(1)) == LOW;
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
  for (int m = 1; m <= maxModuleForOffset(); m++) setModuleNeutral(m);
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

void printModuleRangeError() {
  Serial.print(F("{\"error\":\"module must be 1 to "));
  Serial.print(maxModuleForOffset());
  Serial.println(F("\"}"));
}

// Feeds the next card to module 1. On success returns true. On failure
// (empty hopper or feed timeout) reports the error over Serial, resets all
// servos to neutral, and returns false.
bool feedNextCard() {
  FeedResult feedResult = runFeeder();
  if (feedResult == FEED_DETECTED) return true;

  Serial.print(F("{\"error\":\""));
  Serial.print(feedResult == FEED_EMPTY
    ? F("empty: feeder hopper is out of cards")
    : F("timeout: feeder did not deliver card to module 1"));
  Serial.print(F("\",\"empty\":"));
  Serial.print(feedResult == FEED_EMPTY ? F("true") : F("false"));
  Serial.println(F("}"));
  setAllNeutral();
  return false;
}

// Routes the next fed card according to `direction`:
//   "left"/"right": every module before targetModule has its bottom opened
//     so the card passes through to the next module; targetModule then
//     engages its paddle and pusher to push the card out to that side.
//   "bottom": opens every addressable module's bottom trapdoor at once so
//     the card drops straight through and out the bottom of the whole
//     mechanism, regardless of which module `targetModule` names — a bin
//     can attach "bottom" to any module (there's no separate catch-all
//     bin type).
void routeCard(int targetModule, const char* direction) {
  if (targetModule < 1 || targetModule > maxModuleForOffset()) {
    printModuleRangeError();
    return;
  }

  if (!feedNextCard()) return;

  if (strcmp(direction, "bottom") == 0) {
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);

    Serial.print(F("{\"status\":\"routed\",\"module\":"));
    Serial.print(targetModule);
    Serial.println(F(",\"direction\":\"bottom\"}"));
    return;
  }

  bool pushLeft = strcmp(direction, "left") == 0;

  for (int m = 1; m < targetModule; m++) {
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    if (!waitForCard(m + 1)) {
      Serial.print(F("{\"error\":\"timeout: no card detected at module "));
      Serial.print(m + 1);
      Serial.println(F("\"}"));
      setAllNeutral();
      return;
    }
  }
  if (targetModule > 1) delay(DELAY_CARD_ENTER);

  ModuleConfig& c = moduleConfig[targetModule - 1];
  setServoPosition(getChannel(targetModule, 1), c.paddleOpen);
  delay(DELAY_PADDLE);
  setServoPosition(getChannel(targetModule, 2), pushLeft ? c.pusherLeft : c.pusherRight);
  delay(DELAY_PUSH);
  for (int m = 1; m <= targetModule; m++) setModuleNeutral(m);
  delay(200);

  Serial.print(F("{\"status\":\"routed\",\"module\":"));
  Serial.print(targetModule);
  Serial.print(F(",\"direction\":\""));
  Serial.print(pushLeft ? F("left") : F("right"));
  Serial.println(F("\"}"));
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

  // {"getStatus": true} — report readiness/version on demand. setup() only
  // prints this once per power cycle; native-USB boards like the Uno R4
  // Minima don't reset their sketch when the host closes and reopens the
  // CDC serial port (unlike classic Uno/FTDI boards, where that toggles DTR
  // through a reset capacitor), so a reconnect without a physical
  // power-cycle never re-runs setup(). The app sends this right after
  // opening the port on every connection so it always gets a fresh
  // status/version response instead of only on the very first connect.
  if (doc["getStatus"].is<bool>() && doc["getStatus"].as<bool>()) {
    Serial.print(F("{\"status\":\"ready\",\"version\":\""));
    Serial.print(FIRMWARE_VERSION);
    Serial.println(F("\"}"));
    return;
  }

  // {"setChannelOffset": N} — sets the PCA9685 channel offset before module
  // 1's servos (0 = standard layout starting at channel 0; 4 = legacy
  // layout that reserves channels 0-3 for status LEDs, matching hardware
  // built before module expansion supported more than 3 modules). Sent by
  // the app once per connection, before any other setup/routing command.
  if (doc["setChannelOffset"].is<int>()) {
    moduleChannelOffset = doc["setChannelOffset"].as<int>();
    setAllNeutral();
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    // Open all bottoms and paddles
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
      setServoPosition(getChannel(m, 1), moduleConfig[m - 1].paddleOpen);
    }
    delay(DELAY_PUSH);

    // Move all pushers left
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherLeft);
    }
    delay(DELAY_PUSH);

    // Move all pushers right
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherRight);
    }
    delay(DELAY_PUSH);

    // Reset all servos
    setAllNeutral();
    delay(200);

    // Test feeder: spin briefly to verify motor movement (no card expected)
    setServoPosition(getFeederChannel(), feederConfig.speed);
    delay(500);
    stopFeeder();
    delay(200);

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
  // then returns everything to neutral. Unlike catch-all routing, this doesn't
  // call runFeeder() first - it's meant to flush out whatever's physically
  // stuck regardless of feeder/hopper state.
  if (doc["clearDevice"].is<bool>() && doc["clearDevice"].as<bool>()) {
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);
    Serial.println(F("{\"status\":\"cleared\"}"));
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
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
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
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
    setServoPosition(getFeederChannel(), doc["feederValue"].as<int>());
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
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    Serial.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      if (m > 1) Serial.print(',');
      Serial.print(digitalRead(irPin(m)) == LOW ? F("true") : F("false"));  // true = card present
    }
    Serial.print(F("],\"hopper\":"));
    Serial.print(hopperHasCards() ? F("true") : F("false"));  // true = cards remain in feeder stack
    Serial.println(F("}"));
    return;
  }

  // {"route": {"module": N, "direction": "left"|"right"|"bottom"}} — route
  // the next card to module N, pushed left/right, or dropped through the
  // bottom (any bin can be assigned a "bottom" route, not just a fixed one).
  if (!doc["route"].isNull()) {
    JsonObject route = doc["route"];
    int module = route["module"] | 0;
    const char* direction = route["direction"] | "";
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
      return;
    }
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0 &&
        strcmp(direction, "bottom") != 0) {
      Serial.println(F("{\"error\":\"direction must be left, right, or bottom\"}"));
      return;
    }
    routeCard(module, direction);
    return;
  }

  Serial.println(F("{\"error\":\"unknown command\"}"));
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  for (int m = 0; m < MAX_MODULES; m++) {
    moduleConfig[m] = {300, 310, 300, 310, 295, 300, 305};
  }

  // IR sensors: active LOW (internal pull-up, sensor pulls LOW when card present).
  // All MAX_MODULES pins are set up regardless of the eventual channel
  // offset/module count - harmless, and the app hasn't told us the offset yet.
  for (int m = 0; m < MAX_MODULES; m++) pinMode(IR_PINS[m], INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);

  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.print(F("{\"status\":\"ready\",\"version\":\""));
  Serial.print(FIRMWARE_VERSION);
  Serial.println(F("\"}"));
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
