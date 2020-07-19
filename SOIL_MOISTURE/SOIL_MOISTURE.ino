/*

  # Author : Watchara Pongsri
  # [github/X-c0d3] https://github.com/X-c0d3/
  # Web Site: https://www.rockdevper.com

  Relay Switch
  D1
  D2
  For Soil Moisture Sensor
  AO (analogPin)
*/

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <arduino-timer.h>
#include <time.h>
#include <WiFiClientSecureAxTLS.h>
#include <SocketIoClient.h>
//Required 5.13.x becuase compatible with FirebaseArduino
#include <ArduinoJson.h>

// config parameters
#define deviceId "e50n2azq"
#define deviceName "ESP8266"
#define WIFI_SSID "MY-WIFI"
#define WIFI_PASSWORD "123456789"
#define SOCKETIO_HOST "192.168.1.100"
#define SOCKETIO_PORT 4000
#define SocketIoChannel "ESP"

// Line config
#define LINE_TOKEN "__YOUR_LINE_TOKEN___"

#define INTERVAL_MESSAGE1 500
unsigned long time_1 = 0;

// Config time
int timezone = 7 * 3600; //For thailand timezone
char ntp_server1[20] = "ntp.ku.ac.th";
char ntp_server2[20] = "fw.eng.ku.ac.th";
char ntp_server3[20] = "time.uni.net.th";
int dst = 0;

bool isDebugMode = true;
bool enableLineNotify = true;
bool enableSocketIO = true;


int WATER_THE_PLANTS = D1;
int WATER_SPRINKLER = D2;
int LEDPIN = 16;
int ANALOG_PIN = A0;

SocketIoClient webSocket;

auto timer = timer_create_default(); // create a timer with default settings
Timer<> default_timer; // save as above
Timer<1, millis> task1;
Timer<1, millis> task2;

void setup() {

  Serial.begin(115200); //For debug on cosole (PC)
  pinMode(LEDPIN, OUTPUT);

  pinMode(WATER_THE_PLANTS, OUTPUT); digitalWrite(WATER_THE_PLANTS, HIGH);
  pinMode(WATER_SPRINKLER, OUTPUT); digitalWrite(WATER_SPRINKLER, HIGH);

  setup_Wifi();

  setupTimeZone();

  webSocket.begin(SOCKETIO_HOST, SOCKETIO_PORT);
  webSocket.on("ESP", event);

  timer.every(2000, readSoilMoistureSensor);
}

int moisVal = 0;
void loop() {

  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);
  if (p_tm->tm_hour == 18 && p_tm->tm_min == 0 && p_tm->tm_sec == 0) {
    actionCommand("WATER_SPRINKLER", "state:off", "Water Sprinkler หยุดทำงาน ที่เวลา 18:00", true);
  }

  if (p_tm->tm_hour == 18 && p_tm->tm_min == 0 && p_tm->tm_sec == 2) {
    actionCommand("WATER_THE_PLANTS", "state:off", "Water The Plants หยุดทำงาน ที่เวลา 18:00", true);
  }

  //Vegetable gardenVegetable garden (Auto stop within 30 sec)
  // 07:00
  if (p_tm->tm_hour == 7 && p_tm->tm_min == 0 && p_tm->tm_sec == 0 && moisVal > 380) {
    digitalWrite(WATER_SPRINKLER, LOW);
    checkCurrentStatus(false);
    task1.in(1000 * 30, stopWaterSpringkler);
  }

  // 12:00
  if (p_tm->tm_hour == 12 && p_tm->tm_min == 0 && p_tm->tm_sec == 0 && moisVal > 380) {
    digitalWrite(WATER_SPRINKLER, LOW);
    checkCurrentStatus(false);
    task1.in(1000 * 30, stopWaterSpringkler);
  }

  // 17:00
  if (p_tm->tm_hour == 17 && p_tm->tm_min == 0 && p_tm->tm_sec == 0 && moisVal > 380) {
    digitalWrite(WATER_SPRINKLER, LOW);
    checkCurrentStatus(false);
    task1.in(1000 * 30, stopWaterSpringkler);
  }


  // Water the plants  (Auto stop within 30 sec)
  // 07:30
  if (p_tm->tm_hour == 7 && p_tm->tm_min == 30 && p_tm->tm_sec == 0 && moisVal > 380) {
    digitalWrite(WATER_THE_PLANTS, LOW);
    checkCurrentStatus(false);
    task2.in(1000 * 30, stopWaterThePlants);
  }

  // 17:30
  if (p_tm->tm_hour == 17 && p_tm->tm_min == 30 && p_tm->tm_sec == 0 && moisVal > 380) {
    digitalWrite(WATER_THE_PLANTS, LOW);
    checkCurrentStatus(false);
    task2.in(1000 * 30, stopWaterThePlants);
  }

  webSocket.loop();
  task1.tick();
  task2.tick();
  timer.tick();
}

bool readSoilMoistureSensor(void *) {
  moisVal = analogRead(ANALOG_PIN);
  if (moisVal > 0) {
    createResponse(moisVal);
  }

  digitalWrite(LEDPIN, !digitalRead(LEDPIN));
  return true; // repeat? true
}

String createResponse(float value) {
  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceName"] = "ESP8266";
  root["deviceId"] = deviceId;
  root["lastUpdated"] = NowString();
  root["ipAddress"] = WiFi.localIP().toString();

  JsonObject& data = root.createNestedObject("sensor");
  data["moisture"] = value;

  if (value > 30) {
    if (moisVal >= 1000) {
      printMessage("Sensor is not in the Soil or DISCONNECTED", true);
    }

    if (moisVal < 1000 && moisVal >= 600) {
      printMessage("Soil is DRY (" + String(moisVal) + ")", true);
    }

    if (moisVal < 600  && moisVal >= 370) {
      printMessage("Soil is HUMID (" + String(moisVal) + ")", true);
    }

    if (moisVal < 370) {
      printMessage("Sensor in WATER (" + String(moisVal) + ")", true);
    }
  }

  String output;
  root.prettyPrintTo(output);

  //Publish to socket.io server
  if (enableSocketIO)
    webSocket.emit(SocketIoChannel, output.c_str());

  if (isDebugMode)
    Serial.print(output);
}

void event(const char * payload, size_t length) {
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(String(payload));
  String action = root["action"];
  if (action != "") {
    Serial.printf("=====>: %s\n", payload);
    int delayTime = root["payload"]["delay"];
    String state = root["payload"]["state"];
    String messageInfo = root["payload"]["messageInfo"];
    bool isAuto = root["payload"]["isAuto"];

    String actionName = "";
    if (action == "WATER_SPRINKLER") {
      actionName = "Water Sprinkler";
      if (state == "state:on") {
        digitalWrite(WATER_SPRINKLER, LOW);
        checkCurrentStatus(false);
        task1.in(1000 * delayTime, stopWaterSpringkler);
      }
      else {
        digitalWrite(WATER_SPRINKLER, HIGH);
      }
    }

    if (action == "WATER_THE_PLANTS") {
      actionName = "Water The Plants";
      if (state == "state:on") {
        digitalWrite(WATER_THE_PLANTS, LOW);
        checkCurrentStatus(false);
        task2.in(1000 * delayTime, stopWaterThePlants);
      } else {
        digitalWrite(WATER_THE_PLANTS, HIGH);
      }
    }

    if (action == "checking") {
      checkCurrentStatus(false);
    }

    if (actionName != "") {
      checkCurrentStatus(true);

      String relayStatus = String((state == "state:on") ? "เปิด" : "ปิด");
      String msq = (messageInfo != "") ? messageInfo : "";
      msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
      msq += (isAuto) ? " (Auto)" : " (Manual)";
      Line_Notify(msq);
      Serial.println("[" + actionName + "]: " + relayStatus);
    }
  }
}


void actionCommand(String action, String state, String messageInfo, bool isAuto) {
  if (action == "") return;
  String actionName = "";
  if (action == "WATER_SPRINKLER") {
    actionName = "Water Sprinkler";
    if (state == "state:on") {
      digitalWrite(WATER_SPRINKLER, LOW);
    }
    else {
      digitalWrite(WATER_SPRINKLER, HIGH);
    }
  }


  if (action == "WATER_THE_PLANTS") {
    actionName = "Water The Plants";
    if (state == "state:on") {
      digitalWrite(WATER_THE_PLANTS, LOW);
    }
    else {
      digitalWrite(WATER_THE_PLANTS, HIGH);
    }
  }

  if (actionName != "") {
    checkCurrentStatus(true);

    String relayStatus = String((state == "state:on") ? "เปิด" : "ปิด");
    String msq = (messageInfo != "") ? messageInfo : "";
    msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
    msq += (isAuto) ? " (Auto)" : " (Manual)";
    Line_Notify(msq);
    Serial.println("[" + actionName + "]: " + relayStatus);
  }
}

bool stopWaterSpringkler(void *) {
  digitalWrite(WATER_SPRINKLER, HIGH);
  checkCurrentStatus(true);
  return true; // repeat? true
}

bool stopWaterThePlants(void *) {
  digitalWrite(WATER_THE_PLANTS, HIGH);
  checkCurrentStatus(true);
  return true; // repeat? true
}

void checkCurrentStatus(bool sendLineNotify) {
  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceName"] = "ESP8266";
  root["deviceId"] = deviceId;
  root["lastUpdated"] = NowString();

  JsonObject& data = root.createNestedObject("deviceState");
  data["WATER_THE_PLANTS"] = String((digitalRead(WATER_THE_PLANTS) == LOW) ? "ON" : "OFF");
  data["WATER_SPRINKLER"] = String((digitalRead(WATER_SPRINKLER) == LOW) ? "ON" : "OFF");

  data["IpAddress"] = WiFi.localIP().toString();

  String output;
  root.prettyPrintTo(output);

  //Publish to socket.io server
  if (enableSocketIO)
    webSocket.emit(SocketIoChannel, output.c_str());

  if (sendLineNotify) {
    //Send to Line Notify
    String status = "\r\nRelay Switch Status (ESP8266)";
    status += "\r\nWater The Plants: " + String((digitalRead(WATER_THE_PLANTS) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nWater Sprinkler: " + String((digitalRead(WATER_SPRINKLER) == LOW) ? "เปิด" : "ปิด");
    Line_Notify(status);
  }
}

void printMessage(String message, bool isPrintLn) {
  if (isPrintLn)
    Serial.println(message);
  else
    Serial.print(message);
}

void setup_Wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  Serial.println();
  printMessage("WIFI Connecting...", true);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  //setup_IpAddress();

  Serial.println();
  Serial.print("WIFI Connected ");
  String ip = WiFi.localIP().toString(); Serial.println(ip.c_str());
  Serial.println("Socket.io Server: "); Serial.print(SOCKETIO_HOST);
  Serial.println();
}

void setup_IpAddress() {
  IPAddress local_ip = {192, 168, 137, 144};
  IPAddress gateway = {192, 168, 137, 1};
  IPAddress subnet = {255, 255, 255, 0};
  WiFi.config(local_ip, gateway, subnet);
}

void Line_Notify(String message) {

  if (!enableLineNotify)
    return;

  axTLS::WiFiClientSecure client;
  if (!client.connect("notify-api.line.me", 443)) {
    Serial.println("connection failed");
    return;
  }

  String req = "";
  req += "POST /api/notify HTTP/1.1\r\n";
  req += "Host: notify-api.line.me\r\n";
  req += "Authorization: Bearer " + String(LINE_TOKEN) + "\r\n";
  req += "Cache-Control: no-cache\r\n";
  req += "User-Agent: ESP8266\r\n";
  req += "Content-Type: application/x-www-form-urlencoded\r\n";
  req += "Content-Length: " + String(String("message=" + message).length()) + "\r\n";
  req += "\r\n";
  req += "message=" + message;
  Serial.println(req);
  client.print(req);
  delay(20);

  Serial.println("-------------");
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") {
      break;
    }
    Serial.println(line);
  }
  Serial.println("-------------");
}

String NowString() {
  time_t now = time(nullptr);
  struct tm* newtime = localtime(&now);
  //Serial.println(ctime(&now));
  String tmpNow = "";
  tmpNow += String(newtime->tm_mday);
  tmpNow += "/";
  tmpNow += String(newtime->tm_mon + 1);
  tmpNow += "/";
  tmpNow += String(newtime->tm_year + 1900);
  tmpNow += " ";
  tmpNow += String(newtime->tm_hour);
  tmpNow += ":";
  tmpNow += String(newtime->tm_min);
  tmpNow += ":";
  tmpNow += String(newtime->tm_sec);
  return tmpNow;
}

void setupTimeZone() {
  configTime(timezone, dst, ntp_server1, ntp_server2, ntp_server3);
  Serial.println("Waiting for time");
  while (!time(nullptr)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.println("Now: " + NowString());
}
