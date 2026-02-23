#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// 3 modules, each with 3 servos on consecutive PWM channels:
//   base+0 = Bottom paddle  (closed = resting, open = pass-through)
//   base+1 = Paddles         (left / neutral / right)
//   base+2 = Pushers         (left / neutral / right)
// Module 1: ch0-2, Module 2: ch3-5, Module 3: ch6-8
#define NUM_MODULES 3
#define SERVOS_PER_MODULE 3

#define SERVO_BOTTOM 0
#define SERVO_PADDLE 1
#define SERVO_PUSHER 2

// Per-module calibration — updated at runtime via setConfig command
struct ModuleConfig {
  int bottomClosed, bottomOpen;
  int paddleClosed, paddleOpen;
  int pusherLeft, pusherNeutral, pusherRight;
};

// Safe defaults — kept within 120-490 to avoid mechanical stall at hard limits
ModuleConfig moduleConfig[NUM_MODULES] = {
  {150, 307, 150, 307, 150, 307, 460},
  {150, 307, 150, 307, 150, 307, 460},
  {150, 307, 150, 307, 150, 307, 460},
};

// IR sensor pins (one per module)
const int IR_PINS[NUM_MODULES] = { A0, A1, A2 };
#define IR_THRESHOLD 512
#define IR_TIMEOUT_MS 3000
#define IR_POLL_MS 10

String inputBuffer = "";

// Get the PWM channel for a module (1-based) and servo offset
int getChannel(int module, int servoOffset) {
  return (module - 1) * SERVOS_PER_MODULE + servoOffset;
}

// Get servo offset from name
int getServoOffset(const char* servo) {
  if (strcmp(servo, "bottom") == 0) return SERVO_BOTTOM;
  if (strcmp(servo, "paddle") == 0) return SERVO_PADDLE;
  if (strcmp(servo, "pusher") == 0) return SERVO_PUSHER;
  return -1;
}

// Get pulse for a named position using the per-module calibration
int getPositionPulse(int module, int servoOffset, const char* position) {
  ModuleConfig& c = moduleConfig[module - 1];
  if (servoOffset == SERVO_BOTTOM) {
    if (strcmp(position, "open") == 0)    return c.bottomOpen;
    if (strcmp(position, "neutral") == 0) return c.bottomClosed;
    if (strcmp(position, "closed") == 0)  return c.bottomClosed;
  }
  if (servoOffset == SERVO_PADDLE) {
    if (strcmp(position, "open") == 0)    return c.paddleOpen;
    if (strcmp(position, "neutral") == 0) return c.paddleClosed;
    if (strcmp(position, "closed") == 0)  return c.paddleClosed;
  }
  if (servoOffset == SERVO_PUSHER) {
    if (strcmp(position, "left") == 0)    return c.pusherLeft;
    if (strcmp(position, "neutral") == 0) return c.pusherNeutral;
    if (strcmp(position, "right") == 0)   return c.pusherRight;
  }
  return -1;
}

void setServoPosition(int channel, int pulse) {
  pulse = constrain(pulse, 120, 490);
  pwm.setPWM(channel, 0, pulse);
}

void setModuleNeutral(int module) {
  ModuleConfig& c = moduleConfig[module - 1];
  setServoPosition(getChannel(module, SERVO_BOTTOM), c.bottomClosed);
  setServoPosition(getChannel(module, SERVO_PADDLE), c.paddleClosed);
  setServoPosition(getChannel(module, SERVO_PUSHER), c.pusherNeutral);
}

void setAllNeutral() {
  for (int m = 1; m <= NUM_MODULES; m++) {
    setModuleNeutral(m);
  }
  delay(200);
}


bool isCardAtModule(int module) {
  int val = analogRead(IR_PINS[module - 1]);
  return val < IR_THRESHOLD;
}

bool waitForCard(int module) {
  unsigned long start = millis();
  while (millis() - start < IR_TIMEOUT_MS) {
    if (isCardAtModule(module)) return true;
    delay(IR_POLL_MS);
  }
  return false;
}

bool waitForCardClear(int module) {
  unsigned long start = millis();
  while (millis() - start < IR_TIMEOUT_MS) {
    if (!isCardAtModule(module)) return true;
    delay(IR_POLL_MS);
  }
  return false;
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ;
  }

  for (int i = 0; i < NUM_MODULES; i++) {
    pinMode(IR_PINS[i], INPUT);
  }

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
      if (inputBuffer.length() > 256) {
        inputBuffer = "";
      }
    }
  }
}

void handleCommand(const String& json) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, json);

  if (error) {
    Serial.println("{\"error\":\"invalid JSON\"}");
    return;
  }

  // Handle test command — move all servos to neutral to confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    setAllNeutral();
    Serial.println("{\"status\":\"test_complete\"}");
    return;
  }

  // Handle neutral command — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    Serial.println("{\"status\":\"ok\"}");
    return;
  }

  // Handle setConfig command — store per-module calibration
  // {"setConfig": {"module": 1, "bottomClosed": 102, "bottomOpen": 307, ...}}
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

    JsonDocument response;
    response["status"] = "ok";
    response["module"] = module;
    serializeJson(response, Serial);
    Serial.println();
    return;
  }

  // Handle servo command — move a single servo by position name or raw PWM value
  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}   ← raw value for calibration preview
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;

    if (module < 1 || module > NUM_MODULES) {
      Serial.println("{\"error\":\"module must be 1-3\"}");
      return;
    }

    int servoOffset = getServoOffset(servo);
    if (servoOffset < 0) {
      Serial.println("{\"error\":\"servo must be bottom, paddle, or pusher\"}");
      return;
    }

    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      const char* position = doc["position"] | "neutral";
      pulse = getPositionPulse(module, servoOffset, position);
      if (pulse < 0) {
        Serial.println("{\"error\":\"invalid position\"}");
        return;
      }
    }

    int channel = getChannel(module, servoOffset);
    setServoPosition(channel, pulse);
    delay(200);

    JsonDocument response;
    response["status"] = "ok";
    response["servo"] = servo;
    response["module"] = module;
    serializeJson(response, Serial);
    Serial.println();
    return;
  }

  // Handle bin command
  if (!doc["bin"].is<int>()) {
    Serial.println("{\"error\":\"unknown command\"}");
    return;
  }

  int bin = doc["bin"];

  if (bin < 1 || bin > 7) {
    Serial.println("{\"error\":\"bin must be 1-7\"}");
    return;
  }

  // TODO: bin routing for new servo setup
  Serial.println("{\"error\":\"bin routing not yet configured\"}");
}
