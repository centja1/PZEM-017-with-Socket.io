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
#define deviceName "ESP01"
#define WIFI_SSID "MY-WIFI"
#define WIFI_PASSWORD "123456789"
#define SOCKETIO_HOST "192.168.1.100"
#define SOCKETIO_PORT 4000
#define SocketIoChannel "ESP"

// Line config
#define LINE_TOKEN "__YOUR_LINE_TOKEN___"


unsigned long time_1 = 0;

// Config time
int timezone = 7 * 3600; //For thailand timezone
char ntp_server1[20] = "ntp.ku.ac.th";
char ntp_server2[20] = "fw.eng.ku.ac.th";
char ntp_server3[20] = "time.uni.net.th";
int dst = 0;

bool isDebugMode = true;
bool enableLineNotify = false;
bool enableSocketIO = true;

SocketIoClient webSocket;
auto timer = timer_create_default(); // create a timer with default settings


//Hex command to send to serial for close relay
byte relON[]  = {0xA0, 0x01, 0x01, 0xA2};

//Hex command to send to serial for open relay
byte relOFF[] = {0xA0, 0x01, 0x00, 0xA1};

//Hex command to send to serial for close relay
byte rel2ON[]  = {0xA0, 0x02, 0x01, 0xA3};

//Hex command to send to serial for open relay
byte rel2OFF[] = {0xA0, 0x02, 0x00, 0xA2};



void setup()
{
  Serial.begin(115200); //For debug on cosole (PC)

  setup_Wifi();

  setupTimeZone();

  webSocket.begin(SOCKETIO_HOST, SOCKETIO_PORT);

  webSocket.on("ESP", event);

  timer.every(2000, worker);
}



void loop()
{
  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);

  webSocket.loop();
  timer.tick();
}

bool GRADEN_LIGHT_VAL = false;
bool WALTERFALL_PUMP_VAL = false;

bool worker(void *) {
  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceName"] = "ESP01";
  root["deviceId"] = deviceId;
  root["lastUpdated"] = NowString();
  root["ipAddress"] = WiFi.localIP().toString();

  JsonObject& data = root.createNestedObject("sensor");
  data["temp"] = "x";

  JsonObject& deviceState = root.createNestedObject("deviceState");
  deviceState["GARDEN_LIGHT"] = GRADEN_LIGHT_VAL ? "ON" : "OFF";
  deviceState["WATER_FALL_PUMP"] = WALTERFALL_PUMP_VAL ? "ON" : "OFF";


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
    if (action == "WATER_FALL_PUMP") {
      actionName = "Water fall pump";
      if (state == "state:on") {
        Serial.write(relON, sizeof(relON));
        WALTERFALL_PUMP_VAL = true;
      }
      else {
        Serial.write(relOFF, sizeof(relOFF));
        WALTERFALL_PUMP_VAL = false;
      }
    }

    if (action == "GARDEN_LIGHT") {
      actionName = "Gaden Light";
      if (state == "state:on") {
        Serial.write(rel2ON, sizeof(rel2ON));
        GRADEN_LIGHT_VAL = true;
      } else {
        Serial.write(rel2OFF, sizeof(rel2OFF));
        GRADEN_LIGHT_VAL = false;
      }
    }

    if (actionName != "") {
      String relayStatus = String((state == "state:on") ? "เปิด" : "ปิด");
      String msq = (messageInfo != "") ? messageInfo : "";
      msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
      msq += (isAuto) ? " (Auto)" : " (Manual)";
      Line_Notify(msq);
      Serial.println("[" + actionName + "]: " + relayStatus);
    }
  }
}



void setup_Wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  Serial.println();
  Serial.println("WIFI Connecting...");
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
