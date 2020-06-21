/*

  # Author : Watchara Pongsri
  # [github/X-c0d3] https://github.com/X-c0d3/
  # Web Site: https://www.rockdevper.com

  Relay Switch
  D5
  D6

  For Soil Moisture Sensor
  AO (analogPin)
*/

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <time.h>
#include <WiFiClientSecureAxTLS.h>
#include <ESP8266WebServer.h>
#include <SocketIOClient.h>
//Required 5.13.x becuase compatible with FirebaseArduino
#include <ArduinoJson.h>
#define USE_SERIAL Serial

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

// Config time
int timezone = 7 * 3600; //For thailand timezone
char ntp_server1[20] = "ntp.ku.ac.th";
char ntp_server2[20] = "fw.eng.ku.ac.th";
char ntp_server3[20] = "time.uni.net.th";
int dst = 0;

extern String RID;
extern String Rname;
extern String Rcontent;

int SW1 = D5;
int SW2 = D6;
int LEDPIN = 16;
int ANALOG_PIN = A0;

SocketIOClient socket;
ESP8266WebServer server(80);

void setup() {

  USE_SERIAL.begin(115200); //For debug on cosole (PC)
  pinMode(LEDPIN, OUTPUT);

  setup_Wifi();

  if (!socket.connect(SOCKETIO_HOST, SOCKETIO_PORT)) {
    Serial.println("connection failed");
  }
  if (socket.connected()) {
    socket.send("connection", "message", "Connected !!!!");
  }

  setupTimeZone();

  handleRelaySwitch();
}

int moisVal = 0;
void loop() {

  //Web server
  server.handleClient();

  moisVal = analogRead(ANALOG_PIN);
  digitalWrite(LEDPIN, HIGH);

  if (moisVal > 0) {
    createResponse(moisVal);
  }

  if (!socket.connected()) {
    socket.connect(SOCKETIO_HOST, SOCKETIO_PORT);
    printMessage("Socket.io reconnecting...", false);
    delay(2000);
  }

  if (socket.monitor() && RID == SocketIoChannel && socket.connected()) {
    actionCommand(Rname, Rcontent, "", false);
  }

  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);
  if (p_tm->tm_hour == 18 && p_tm->tm_min == 0 && p_tm->tm_sec == 0) {
    actionCommand("SW1", "state:off", "Invert หยุดทำงาน ที่เวลา 15:00", true);
  }

  delay(2000);
  digitalWrite(LEDPIN, LOW);
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
  //data["current_usage"] = current_usage;

  if (value > 0) {
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

  socket.sendJSON(SocketIoChannel, output);
  USE_SERIAL.print(output);
}

void actionCommand(String action, String payload, String messageInfo, bool isAuto) {
  Serial.println("State => " + payload);
  if (action == "") return;

  String actionName = "";
  if (action == "SW1") {
    actionName = "Water Sprinkler";
    digitalWrite(SW1, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "SW2") {
    actionName = "Waterfall Pump";
    digitalWrite(SW2, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "checking") {
    checkCurrentStatus(false);
  }

  if (actionName != "") {
    checkCurrentStatus(true);

    String relayStatus = String((payload == "state:on") ? "เปิด" : "ปิด");
    String msq = (messageInfo != "") ? messageInfo : "";
    msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
    msq += (isAuto) ? " (Auto)" : " (Manual)";
    Line_Notify(msq);
    Serial.println("[" + actionName + "]: " + relayStatus);
  }
}

void checkCurrentStatus(bool sendLineNotify) {
  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceName"] = "ESP8266";
  root["deviceId"] = deviceId;
  root["lastUpdated"] = NowString();

  JsonObject& data = root.createNestedObject("deviceState");
  data["SW1"] = String((digitalRead(SW1) == LOW) ? "ON" : "OFF");
  data["SW2"] = String((digitalRead(SW2) == LOW) ? "ON" : "OFF");

  data["IpAddress"] = WiFi.localIP().toString();

  String output;
  root.prettyPrintTo(output);

  socket.sendJSON(SocketIoChannel, output);

  if (sendLineNotify) {
    //Send to Line Notify
    String status = "\r\nRelay Switch Status";
    status += "\r\nWaterfall Pump: " + String((digitalRead(SW1) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nWater Sprinkler: " + String((digitalRead(SW2) == LOW) ? "เปิด" : "ปิด");
    Line_Notify(status);
  }
}

void printMessage(String message, bool isPrintLn) {
  if (isPrintLn)
    USE_SERIAL.println(message);
  else
    USE_SERIAL.print(message);
}

void setup_Wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  USE_SERIAL.println();
  printMessage("WIFI Connecting...", true);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  //setup_IpAddress();

  USE_SERIAL.println();
  USE_SERIAL.print("WIFI Connected ");
  String ip = WiFi.localIP().toString(); USE_SERIAL.println(ip.c_str());
  USE_SERIAL.println("Socket.io Server: "); USE_SERIAL.print(SOCKETIO_HOST);
  USE_SERIAL.println();
}

void setup_IpAddress() {
  IPAddress local_ip = {192, 168, 137, 144};
  IPAddress gateway = {192, 168, 137, 1};
  IPAddress subnet = {255, 255, 255, 0};
  WiFi.config(local_ip, gateway, subnet);
}

void Line_Notify(String message) {
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

void handleRoot() {
  String cmd;
  cmd += "<!DOCTYPE HTML>\r\n";
  cmd += "<html>\r\n";
  cmd += "<head>";
  cmd += "<meta http-equiv='refresh' content='5'/>";
  cmd += "</head>";

  cmd += "<br/>Waterfall Pump  : " + String((digitalRead(SW1) == LOW) ? "ON" : "OFF");
  cmd += "<br/>Water Sprinkler  : " + String((digitalRead(SW2) == LOW) ? "ON" : "OFF");

  cmd += "<html>\r\n";
  server.send(200, "text/html", cmd);
}

void handleRelaySwitch() {

  pinMode(SW1, OUTPUT); digitalWrite(SW1, HIGH);
  pinMode(SW2, OUTPUT); digitalWrite(SW2, HIGH);

  server.on("/", handleRoot);
  server.on("/sw1=1", []() {
    server.send(200, "text/plain", "SW1 = ON"); digitalWrite(SW1, LOW);
  });

  server.on("/sw1=0", []() {
    server.send(200, "text/plain", "SW1 = OFF"); digitalWrite(SW1, HIGH);
  });

  server.on("/sw2=1", []() {
    server.send(200, "text/plain", "SW2 = ON"); digitalWrite(SW2, LOW);
  });

  server.on("/sw2=0", []() {
    server.send(200, "text/plain", "SW2 = OFF"); digitalWrite(SW2, HIGH);
  });

  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server started");
}

void handleNotFound() {
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  server.send(404, "text/plain", message);
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
  USE_SERIAL.println("Waiting for time");
  while (!time(nullptr)) {
    USE_SERIAL.print(".");
    delay(500);
  }
  USE_SERIAL.println();
  USE_SERIAL.println("Now: " + NowString());
}
