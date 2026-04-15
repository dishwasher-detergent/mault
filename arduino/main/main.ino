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
  int speed;     // PWM pulse for forward motion
  int duration;  // milliseconds to run before auto-stopping
};

FeederConfig feederConfig = {400, 100};

// Routing delays (ms) — tune to match your hardware timing
#define DELAY_PASS_MODULE  400  // time for card to drop through a pass-through module
#define DELAY_CARD_ENTER   300  // time for card to settle after target bottom opens
#define DELAY_PADDLE       150  // time for paddle to engage
#define DELAY_PUSH         600  // time for pusher to complete its stroke

String inputBuffer = "";

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
//   Bin 1: open module 1 side paddles, then push left
//   Bin 2: open module 1 side paddles, then push right
//   Bin 3: open module 1 bottom, then module 2 side paddles, then push left
//   Bin 4: open module 1 bottom, then module 2 side paddles, then push right
//   Bin 5: open module 1 + 2 bottoms, then module 3 side paddles, then push left
//   Bin 6: open module 1 + 2 bottoms, then module 3 side paddles, then push right
//   Bin 7: open all bottoms (catch-all)
void routeCard(int bin) {
  if (bin < 1 || bin > 7) {
    Serial.println("{\"error\":\"bin must be 1-7\"}");
    return;
  }

  setServoPosition(FEEDER_CHANNEL, feederConfig.speed); 
  delay(feederConfig.duration);
  stopFeeder();

  if (bin == 7) {
    // Open bottom on all modules so the card passes through to the catch-all position
    for (int m = 1; m <= NUM_MODULES; m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);

  } else if (bin <= 2) {
    // Module 1: open paddle first, then push
    ModuleConfig& c = moduleConfig[0];
    setServoPosition(getChannel(1, 1), c.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(1, 2), bin == 1 ? c.pusherLeft : c.pusherRight);
    delay(DELAY_PUSH);
    setModuleNeutral(1);
    delay(200);

  } else if (bin <= 4) {
    // Bins 3-4: open module 1 bottom so card passes through, then use module 2 paddles + pusher
    bool pushLeft = (bin == 3);

    // Pass through module 1
    setServoPosition(getChannel(1, 0), moduleConfig[0].bottomOpen);
    delay(DELAY_PASS_MODULE);

    // Engage module 2 side paddles and push
    ModuleConfig& c2 = moduleConfig[1];
    setServoPosition(getChannel(2, 1), c2.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(2, 2), pushLeft ? c2.pusherLeft : c2.pusherRight);
    delay(DELAY_PUSH);

    // Reset involved modules
    setModuleNeutral(1);
    setModuleNeutral(2);
    delay(200);

  } else {
    // Bins 5-6: open module 1+2 bottoms so card passes through, then use module 3 paddles + pusher
    bool pushLeft = (bin == 5);

    // Pass through modules 1 and 2
    setServoPosition(getChannel(1, 0), moduleConfig[0].bottomOpen);
    setServoPosition(getChannel(2, 0), moduleConfig[1].bottomOpen);
    delay(DELAY_PASS_MODULE * 2);

    // Engage module 3 side paddles and push
    ModuleConfig& c3 = moduleConfig[2];
    setServoPosition(getChannel(3, 1), c3.paddleOpen);
    delay(DELAY_PADDLE);
    setServoPosition(getChannel(3, 2), pushLeft ? c3.pusherLeft : c3.pusherRight);
    delay(DELAY_PUSH);

    // Reset involved modules
    setModuleNeutral(1);
    setModuleNeutral(2);
    setModuleNeutral(3);
    delay(200);
  }

  JsonDocument res;
  res["status"] = "routed";
  res["bin"]    = bin;
  serializeJson(res, Serial);
  Serial.println();
}

void handleCommand(const String& json) {
  JsonDocument doc;
  if (deserializeJson(doc, json)) {
    Serial.println("{\"error\":\"invalid JSON\"}");
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

    // Test feeder: spin forward for configured duration then stop
    setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
    delay(feederConfig.duration);
    stopFeeder();
    delay(200);

    // Cycle through LEDs
    for (int led = 1; led <= 4; led++) {
      pwm.setPin(led - 1, 4095);
      delay(150);
      pwm.setPin(led - 1, 0);
      delay(100);
    }

    Serial.println("{\"status\":\"test_complete\"}");
    return;
  }

  // {"neutral": true} — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    Serial.println("{\"status\":\"ok\"}");
    return;
  }

  // {"led": 1, "on": true} — control LED by position (1 or 2)
  if (doc["led"].is<int>()) {
    int led = doc["led"].as<int>();
    if (led < 1 || led > 4) {
      Serial.println("{\"error\":\"led must be 1 to 4\"}");
      return;
    }
    bool on = doc["on"] | false;
    pwm.setPin(led - 1, on ? 4095 : 0);

    JsonDocument res;
    res["status"] = "ok";
    res["led"] = led;
    res["on"] = on;
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      Serial.println("{\"error\":\"module must be 1-3\"}");
      return;
    }
    int offset = getServoOffset(servo);
    if (offset < 0) {
      Serial.println("{\"error\":\"servo must be bottom, paddle, or pusher\"}");
      return;
    }
    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      pulse = getPositionPulse(module, offset, doc["position"] | "neutral");
      if (pulse < 0) {
        Serial.println("{\"error\":\"invalid position\"}");
        return;
      }
    }
    setServoPosition(getChannel(module, offset), pulse);
    delay(200);

    JsonDocument res;
    res["status"] = "ok";
    res["servo"] = servo;
    res["module"] = module;
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObject cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (module < 1 || module > NUM_MODULES) {
      Serial.println("{\"error\":\"module must be 1-3\"}");
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
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"feeder": true} — run feeder forward for configured duration then stop
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    setServoPosition(FEEDER_CHANNEL, feederConfig.speed);
    delay(feederConfig.duration);
    stopFeeder();
    JsonDocument res;
    res["status"] = "ok";
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"feederValue": N} — set raw PWM (for calibration preview, does not auto-stop)
  if (doc["feederValue"].is<int>()) {
    setServoPosition(FEEDER_CHANNEL, doc["feederValue"].as<int>());
    JsonDocument res;
    res["status"] = "ok";
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"feederStop": true} — stop feeder immediately
  if (doc["feederStop"].is<bool>() && doc["feederStop"].as<bool>()) {
    stopFeeder();
    JsonDocument res;
    res["status"] = "ok";
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"setFeederConfig": {"speed": N, "duration": N}} — update feeder calibration
  if (!doc["setFeederConfig"].isNull()) {
    JsonObject cfg = doc["setFeederConfig"];
    feederConfig.speed    = cfg["speed"]    | feederConfig.speed;
    feederConfig.duration = cfg["duration"] | feederConfig.duration;
    stopFeeder();
    JsonDocument res;
    res["status"] = "ok";
    serializeJson(res, Serial);
    Serial.println();
    return;
  }

  // {"bin": N} — route the next card to bin N (1–7)
  if (doc["bin"].is<int>()) {
    routeCard(doc["bin"].as<int>());
    return;
  }

  Serial.println("{\"error\":\"unknown command\"}");
}

void setup() {
  Serial.begin(9600);
  while (!Serial);
  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.println("{\"status\":\"ready\"}");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        handleCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
      if (inputBuffer.length() > 256) inputBuffer = "";
    }
  }
}
