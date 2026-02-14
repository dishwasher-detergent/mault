#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// Pulse length constants for 180° servos at 50 Hz
// 102 = 0°, 307 = 90°, 512 = 180°
#define SERVO_MIN 102
#define SERVO_MAX 512

// Servo positions (pulse lengths)
#define POS_NEUTRAL 307   // 90° center
#define POS_LEFT    102   // 0°
#define POS_RIGHT   512   // 180°
#define POS_DOWN    102   // 0° (gate open)

// Servo channel assignments per module (3 servos each)
// Module 1: ch0 (LEFT), ch1 (RIGHT), ch2 (DOWN)
// Module 2: ch3 (LEFT), ch4 (RIGHT), ch5 (DOWN)
// Module 3: ch6 (LEFT), ch7 (RIGHT), ch8 (DOWN)

struct RouteStep {
  int module;
  const char* action;
  int channel;
};

// Route definitions for bins 1-7
// Each bin has up to 3 steps; stepCount indicates how many are valid
struct BinRoute {
  RouteStep steps[3];
  int stepCount;
};

const BinRoute BIN_ROUTES[7] = {
  // Bin 1: M1 LEFT
  { { {1, "LEFT", 0} }, 1 },
  // Bin 2: M1 RIGHT
  { { {1, "RIGHT", 1} }, 1 },
  // Bin 3: M1 DOWN -> M2 LEFT
  { { {1, "DOWN", 2}, {2, "LEFT", 3} }, 2 },
  // Bin 4: M1 DOWN -> M2 RIGHT
  { { {1, "DOWN", 2}, {2, "RIGHT", 4} }, 2 },
  // Bin 5: M1 DOWN -> M2 DOWN -> M3 LEFT
  { { {1, "DOWN", 2}, {2, "DOWN", 5}, {3, "LEFT", 6} }, 3 },
  // Bin 6: M1 DOWN -> M2 DOWN -> M3 RIGHT
  { { {1, "DOWN", 2}, {2, "DOWN", 5}, {3, "RIGHT", 7} }, 3 },
  // Bin 7: M1 DOWN -> M2 DOWN -> M3 DOWN
  { { {1, "DOWN", 2}, {2, "DOWN", 5}, {3, "DOWN", 8} }, 3 },
};

String inputBuffer = "";

void setServoPosition(int channel, int pulse) {
  pwm.setPWM(channel, 0, pulse);
}

int getActionPulse(const char* action) {
  if (strcmp(action, "LEFT") == 0) return POS_LEFT;
  if (strcmp(action, "RIGHT") == 0) return POS_RIGHT;
  if (strcmp(action, "DOWN") == 0) return POS_DOWN;
  return POS_NEUTRAL;
}

void setAllNeutral() {
  for (int ch = 0; ch < 9; ch++) {
    setServoPosition(ch, POS_NEUTRAL);
  }
}

void runTestSweep() {
  for (int ch = 0; ch < 9; ch++) {
    // Determine active position based on servo type
    // ch % 3 == 0: LEFT servo, ch % 3 == 1: RIGHT servo, ch % 3 == 2: DOWN servo
    int activePos;
    switch (ch % 3) {
      case 0: activePos = POS_LEFT; break;
      case 1: activePos = POS_RIGHT; break;
      default: activePos = POS_DOWN; break;
    }

    setServoPosition(ch, activePos);
    delay(300);
    setServoPosition(ch, POS_NEUTRAL);
    delay(200);
  }
}

void executeRoute(const BinRoute& route) {
  for (int i = 0; i < route.stepCount; i++) {
    int channel = route.steps[i].channel;
    int pulse = getActionPulse(route.steps[i].action);
    setServoPosition(channel, pulse);
    delay(200);
  }
  delay(300);
  setAllNeutral();
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect (needed for native USB)
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
      // Guard against buffer overflow
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

  // Handle test command
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    runTestSweep();
    Serial.println("{\"status\":\"test_complete\"}");
    return;
  }

  if (!doc["bin"].is<int>()) {
    Serial.println("{\"error\":\"missing bin number\"}");
    return;
  }

  int bin = doc["bin"];

  if (bin < 1 || bin > 7) {
    Serial.println("{\"error\":\"bin must be 1-7\"}");
    return;
  }

  const BinRoute& route = BIN_ROUTES[bin - 1];

  // Execute the physical servo movements
  executeRoute(route);

  // Build response JSON
  JsonDocument response;
  response["bin"] = bin;
  JsonArray routeArray = response["route"].to<JsonArray>();

  for (int i = 0; i < route.stepCount; i++) {
    JsonObject step = routeArray.add<JsonObject>();
    step["module"] = route.steps[i].module;
    step["action"] = route.steps[i].action;
    step["channel"] = route.steps[i].channel;
  }

  serializeJson(response, Serial);
  Serial.println();
}
