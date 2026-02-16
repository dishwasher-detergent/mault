#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

struct RouteStep {
  int module;         // 1-based module number
  const char* action; // "LEFT", "RIGHT", or "DOWN"
};

struct BinRoute {
  RouteStep steps[3];
  int stepCount;
};

// Pulse length constants for 9g micro servos at 50 Hz
// Safe range: ~10° to ~170° to avoid stalling at mechanical limits
// 102 = 0°, 307 = 90°, 512 = 180°
#define SERVO_MIN 125     // ~10°
#define SERVO_MAX 489     // ~170°

// Servo positions (pulse lengths)
#define POS_NEUTRAL 307   // 90° center
#define POS_LEFT    125   // ~10°
#define POS_RIGHT   489   // ~170°
#define POS_DOWN    125   // ~10° (gate open)

// Each module has 3 servos on consecutive PWM channels:
//   base+0 = LEFT servo
//   base+1 = RIGHT servo
//   base+2 = DOWN servo
// Module 1: ch0-2, Module 2: ch3-5, Module 3: ch6-8
#define NUM_MODULES 3
#define SERVOS_PER_MODULE 3

// Action offsets within a module
#define ACTION_LEFT  0
#define ACTION_RIGHT 1
#define ACTION_DOWN  2

// IR sensor pins (one per module, analog)
const int IR_PINS[NUM_MODULES] = { A0, A1, A2 };

// IR sensor threshold — below this value means card is detected
// Adjust based on your sensor; IR obstacle sensors typically read LOW when triggered
#define IR_THRESHOLD 512

// Max time (ms) to wait for a card to arrive at a module before reporting a jam
#define IR_TIMEOUT_MS 3000

// Polling interval (ms) when checking IR sensor
#define IR_POLL_MS 10

// Get the PWM channel for a given module (1-based) and action offset
int getChannel(int module, int actionOffset) {
  return (module - 1) * SERVOS_PER_MODULE + actionOffset;
}

// Get the action offset from a string
int getActionOffset(const char* action) {
  if (strcmp(action, "LEFT") == 0)  return ACTION_LEFT;
  if (strcmp(action, "RIGHT") == 0) return ACTION_RIGHT;
  if (strcmp(action, "DOWN") == 0)  return ACTION_DOWN;
  return -1;
}

// Get the target pulse for an action offset
int getActionPulse(int actionOffset) {
  switch (actionOffset) {
    case ACTION_LEFT:  return POS_LEFT;
    case ACTION_RIGHT: return POS_RIGHT;
    case ACTION_DOWN:  return POS_DOWN;
    default:           return POS_NEUTRAL;
  }
}

// Routes only need module + action; channel is computed at runtime
const BinRoute BIN_ROUTES[7] = {
  // Bin 1: M1 LEFT
  { { {1, "LEFT"} }, 1 },
  // Bin 2: M1 RIGHT
  { { {1, "RIGHT"} }, 1 },
  // Bin 3: M1 DOWN -> M2 LEFT
  { { {1, "DOWN"}, {2, "LEFT"} }, 2 },
  // Bin 4: M1 DOWN -> M2 RIGHT
  { { {1, "DOWN"}, {2, "RIGHT"} }, 2 },
  // Bin 5: M1 DOWN -> M2 DOWN -> M3 LEFT
  { { {1, "DOWN"}, {2, "DOWN"}, {3, "LEFT"} }, 3 },
  // Bin 6: M1 DOWN -> M2 DOWN -> M3 RIGHT
  { { {1, "DOWN"}, {2, "DOWN"}, {3, "RIGHT"} }, 3 },
  // Bin 7: M1 DOWN -> M2 DOWN -> M3 DOWN
  { { {1, "DOWN"}, {2, "DOWN"}, {3, "DOWN"} }, 3 },
};

String inputBuffer = "";

// Check if the IR sensor for a module (1-based) detects a card
bool isCardAtModule(int module) {
  int val = analogRead(IR_PINS[module - 1]);
  return val < IR_THRESHOLD;
}

// Wait for a card to arrive at a module. Returns true if detected, false on timeout.
bool waitForCard(int module) {
  unsigned long start = millis();
  while (millis() - start < IR_TIMEOUT_MS) {
    if (isCardAtModule(module)) {
      return true;
    }
    delay(IR_POLL_MS);
  }
  return false;
}

// Wait for the card to leave a module (sensor clears). Returns true if cleared, false on timeout.
bool waitForCardClear(int module) {
  unsigned long start = millis();
  while (millis() - start < IR_TIMEOUT_MS) {
    if (!isCardAtModule(module)) {
      return true;
    }
    delay(IR_POLL_MS);
  }
  return false;
}

void setServoPosition(int channel, int pulse) {
  pwm.setPWM(channel, 0, pulse);
}

void setAllNeutral() {
  for (int m = 1; m <= NUM_MODULES; m++) {
    for (int a = 0; a < SERVOS_PER_MODULE; a++) {
      setServoPosition(getChannel(m, a), POS_NEUTRAL);
    }
  }
  delay(200);
}

void runTestSweep() {
  for (int m = 1; m <= NUM_MODULES; m++) {
    for (int a = 0; a < SERVOS_PER_MODULE; a++) {
      int ch = getChannel(m, a);
      int activePos = getActionPulse(a);

      setServoPosition(ch, activePos);
      delay(300);
      setServoPosition(ch, POS_NEUTRAL);
      delay(200);
    }
  }
}

// Execute a route with IR sensor confirmation between modules.
// Returns 0 on success, or the module number where the jam occurred.
int executeRoute(const BinRoute& route) {
  int prevModule = 0;
  for (int i = 0; i < route.stepCount; i++) {
    int module = route.steps[i].module;
    int actionOffset = getActionOffset(route.steps[i].action);
    int channel = getChannel(module, actionOffset);
    int pulse = getActionPulse(actionOffset);

    // If moving to a new module, wait for the card to arrive via IR sensor
    if (prevModule != 0 && module != prevModule) {
      if (!waitForCard(module)) {
        // Card didn't arrive — jam detected
        setAllNeutral();
        return module;
      }
    }

    setServoPosition(channel, pulse);
    delay(200); // servo movement time

    prevModule = module;
  }

  // Wait for card to clear the final module
  int lastModule = route.steps[route.stepCount - 1].module;
  waitForCardClear(lastModule);

  setAllNeutral();
  return 0;
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect (needed for native USB)
  }

  // Set up IR sensor pins
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
  int jamModule = executeRoute(route);

  if (jamModule != 0) {
    // Card jam — report to web app
    JsonDocument response;
    response["error"] = "jam";
    response["bin"] = bin;
    response["module"] = jamModule;
    serializeJson(response, Serial);
    Serial.println();
    return;
  }

  // Build success response JSON
  JsonDocument response;
  response["bin"] = bin;
  JsonArray routeArray = response["route"].to<JsonArray>();

  for (int i = 0; i < route.stepCount; i++) {
    int actionOffset = getActionOffset(route.steps[i].action);
    JsonObject step = routeArray.add<JsonObject>();
    step["module"] = route.steps[i].module;
    step["action"] = route.steps[i].action;
    step["channel"] = getChannel(route.steps[i].module, actionOffset);
  }

  serializeJson(response, Serial);
  Serial.println();
}
