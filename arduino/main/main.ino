#include <ArduinoJson.h>

// Servo channel assignments per module
// Module 1: channels 0 (LEFT/RIGHT), 1 (DOWN gate)
// Module 2: channels 2 (LEFT/RIGHT), 3 (DOWN gate)
// Module 3: channels 4 (LEFT/RIGHT), 5 (DOWN gate)

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
  { { {1, "RIGHT", 0} }, 1 },
  // Bin 3: M1 DOWN -> M2 LEFT
  { { {1, "DOWN", 1}, {2, "LEFT", 2} }, 2 },
  // Bin 4: M1 DOWN -> M2 RIGHT
  { { {1, "DOWN", 1}, {2, "RIGHT", 2} }, 2 },
  // Bin 5: M1 DOWN -> M2 DOWN -> M3 LEFT
  { { {1, "DOWN", 1}, {2, "DOWN", 3}, {3, "LEFT", 4} }, 3 },
  // Bin 6: M1 DOWN -> M2 DOWN -> M3 RIGHT
  { { {1, "DOWN", 1}, {2, "DOWN", 3}, {3, "RIGHT", 4} }, 3 },
  // Bin 7: M1 DOWN -> M2 DOWN -> M3 DOWN
  { { {1, "DOWN", 1}, {2, "DOWN", 3}, {3, "DOWN", 5} }, 3 },
};

String inputBuffer = "";

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect (needed for native USB)
  }
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
