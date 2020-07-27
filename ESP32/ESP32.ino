/*

  # Author : Watchara Pongsri
  # [github/X-c0d3] https://github.com/X-c0d3/
  # Web Site: https://wwww.rockdevper.com


  Note: For Relay switch i am using active "Low"

  RegAddr Description                 Resolution
  0x0000  Voltage value               1LSB correspond to 0.01V
  0x0001  Current value low 16 bits   1LSB correspond to 0.01A
  0x0002  Power value low 16 bits     1LSB correspond to 0.1W
  0x0003  Power value high 16 bits    1LSB correspond to 0.1W
  0x0004  Energy value low 16 bits    1LSB correspond to 1Wh
  0x0005  Energy value high 16 bits   1LSB correspond to 1Wh
  0x0006  High voltage alarm          0xFFF is alarm, 0x0000 is not alarm
  0x0007  Low voltage alarm           0xFFF is alarm, 0x0000 is not alarm

  Read and modify the slave parameters
  - At present,it only supports reading and modifying slave address and power alarm threshold
  The register is arranged as the following table

  0x0000  High voltage alarm threshold (5~350V) ,default is 300V        1LSB correspond to 0.01V
  0x0001  Low voltage alarm threshold（1~350V）,default is 7V            1LSB correspond to 0.01V
  0x0002  Modbus-RTU address                                            The range is 0x0001~0x00F7
  0x0003  The current range(only for PZEM-017)                          0x0000：100A
                                                                        0x0001：50A
                                                                        0x0002: 200A
                                                                        0x0003：300A


  Ref: http://myosuploads3.banggood.com/products/20190723/20190723213410PZEM-003017UserManual.pdf
  Ref: http://solar4living.com/pzem-arduino-modbus.htm
  Ref: https://github.com/armtronix/Wifi-Single-Dimmer-Board/blob/ba577f0539a1fc73145e24bb50342eb1dca86594/Wifi-Single-Dimmer-Board/Arduino_Code/Wifi_single_dimmer_tasmota/sonoff_betaV0.3/xnrg_06_pzem_dc.ino
  Ref: https://github.com/EvertDekker/Pzem016Test/blob/e95c1e6bb2d384a93910be2c8b867e40669a24b4/Pzem016Test.ino
  Ref: https://github.com/Links2004/arduinoWebSockets/blob/master/examples/esp8266/WebSocketClientSocketIO/WebSocketClientSocketIO.ino
  Ref: https://github.com/washo4evr/Socket.io-v1.x-Library/blob/master/SocketIOClient.h
  Ref: https://github.com/lorenz4672/PZEM017/blob/master/src/main.cpp
  Ref: https://solarduino.com/pzem-017-dc-energy-meter-with-arduino/

*/

#include <Arduino.h>
#include <time.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <arduino-timer.h>
#include "FirebaseESP32.h"
#include <HardwareSerial.h>
#include "PZEM017.h"
#include <SocketIoClient.h>
#include <ArduinoJson.h>
#include <string.h>
#include <cstdlib>
#include <ACROBOTIC_SSD1306.h>
#include "DHTesp.h"

// config parameters
#define deviceId "e49n2dix"
#define deviceName "ESP32"
#define WIFI_SSID "MY-WIFI"
#define WIFI_PASSWORD "123456789"
#define SOCKETIO_HOST "192.168.1.100"
#define SOCKETIO_PORT 4000
#define SocketIoChannel "ESP"

// Line config
#define LINE_TOKEN "__YOUR_LINE_TOKEN___"

// Firebase config
#define FIREBASE_HOST "xxxxxxxxxxxxx.firebaseio.com"
#define FIREBASE_AUTH "____FIREBASE_KEY____"

#define INTERVAL_MESSAGE1 500
unsigned long time_1 = 0;

// Config time
int timezone = 7;
char ntp_server1[20] = "ntp.ku.ac.th";
char ntp_server2[20] = "fw.eng.ku.ac.th";
char ntp_server3[20] = "time.uni.net.th";
int dst = 0;

float inverterVoltageStart = 13.30;
float inverterVoltageShutdown = 11.20;
float hightVoltage = 15.10;
float lowVoltage = 10.50;

bool isDebugMode = true;
bool enableLineNotify = true;
bool enableSocketIO = true;

SocketIoClient webSocket;
FirebaseData firebaseData;

// OLED
// 21 SDA
// 22 SCK/SCL

// PZEM - 017
// RX 16
// TX 17

// DHT11
int DHTpin = 15;

// Relay Switch
int SPOTLIGHT = 27;
int LIGHT = 26;
int INVERTER  = 25;
int COOLING_FAN = 33;
int SW5 = 32;

//Indicates that the master needs to read 8 registers with slave address 0x01 and the start address of the register is 0x0000.
static uint8_t pzemSlaveAddr = 0x01; // PZEM default address

//Make sure RX (16) & TX (17) is connected jumper
PZEM017 pzem(&Serial2, pzemSlaveAddr, 9600);
DHTesp dht;

auto timer = timer_create_default(); // create a timer with default settings
Timer<> default_timer; // save as above

void setup() {
  // OLED Display
  InitialOLED();

  Serial.begin(115200);
  setup_Wifi();

  //pzem.setAddress(0x02);
  pzem.setCurrentShunt(1); //pzem.setCurrentShunt(0x0001);
  //pzem.setLOWVoltageAlarm(5);
  //pzem.setHIVoltageAlarm(48);

  dht.setup(DHTpin, DHTesp::DHT11); //for DHT11 Connect DHT sensor to GPIO 15
  pinMode(LED_BUILTIN, OUTPUT);

  setupTimeZone();
  setUpFireBase();
  handleRelaySwitch();

  webSocket.begin(SOCKETIO_HOST, SOCKETIO_PORT);
  webSocket.on("ESP", event);

  timer.every(2000, readPzemSensor);
}

bool inverterStarted = false;
bool solarboxFanStarted = false;
String batteryStatusMessage;
float energy_kWhtoday = 0;
float energy_start = 0;

void loop() {
  unsigned long currentMillis = millis();

  //Shutdown Inverter on 15:00
  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);
  if (p_tm->tm_hour == 15 && p_tm->tm_min == 30 && p_tm->tm_sec == 0) {
    if (currentMillis - time_1 >= INTERVAL_MESSAGE1) {
      time_1 = currentMillis;
      actionCommand("INVERTER", "state:off", "Invert หยุดทำงาน ที่เวลา 15:00", true, true);
    }
  }

  //Shutdown Inverter on 16:30
  if (p_tm->tm_hour == 16 && p_tm->tm_min == 30 && p_tm->tm_sec == 0) {
    if (currentMillis - time_1 >= INTERVAL_MESSAGE1) {
      time_1 = currentMillis;
      actionCommand("INVERTER", "state:off", "", true, false);
      actionCommand("COOLING_FAN", "state:off", " ", true, false);
    }
  }

  // Reset FirebaseData per day
  if (p_tm->tm_hour == 23 && p_tm->tm_min == 59)   {
    if (Firebase.deleteNode(firebaseData, "/data")) {
      Serial.print("delete /data failed:");
      Serial.println("Firebase Error: " + firebaseData.errorReason());
      // reset energy every day
      pzem.resetEnergy();
    }
  }

  webSocket.loop();
  timer.tick();
}

bool readPzemSensor(void *) {
  if (isDebugMode)
    pzem.getSlaveParameters();

  // pzem.getPowerAlarm();

  // PZEM-017
  float voltage = !isnan(pzem.voltage()) ? pzem.voltage() : 0;
  float current = !isnan(pzem.current()) ? pzem.current() : 0;
  float power = !isnan(pzem.power()) ? pzem.power() * 10 : 0;
  float energy = !isnan(pzem.energy()) ? pzem.energy() * 10 : 0;
  uint16_t over_power_alarm = pzem.VoltHighAlarm();
  uint16_t lower_power_alarm = pzem.VoltLowAlarm();
  uint16_t powerAlarm = pzem.getPowerAlarm();
  // DHT11
  float humidity = !isnan(dht.getHumidity()) ? dht.getHumidity() : 0;
  float temperature = !isnan(dht.getTemperature()) ? dht.getTemperature() : 0;

  if (!energy_start || (energy < energy_start)) {
    energy_start = energy;  // Init after restart and hanlde roll-over if any
  }
  energy_kWhtoday += (energy - energy_start);
  energy_start = energy;

  oled.setTextXY(2, 1);
  oled.putString("- S1:" + String((digitalRead(INVERTER) == LOW) ? "ON" : "OFF") + " S2:" + String((digitalRead(COOLING_FAN) == LOW) ? "ON" : "OFF") + " S3:" + String((digitalRead(LIGHT) == LOW) ? "ON" : "OFF") + " -");

  if (voltage > 3 && voltage < 300) {
    digitalWrite(LED_BUILTIN, HIGH);
    // Build Messages For Line Notify
    batteryStatusMessage = "\r\n===============\r\n - Battery Status - \r\n";
    batteryStatusMessage += "VOLTAGE: " + String(voltage) + "V\r\n";
    batteryStatusMessage += "CURRENT: " + String(current) + "A\r\n";
    batteryStatusMessage += "POWER: " + String(power) + "W\r\n";
    batteryStatusMessage += "ENERGY: " + String(energy_kWhtoday) + "WH";

    time_t now = time(nullptr);
    struct tm* p_tm = localtime(&now);

    if ((voltage >= inverterVoltageStart && voltage <= hightVoltage) &&  !inverterStarted && p_tm->tm_hour <= 15) {
      actionCommand("INVERTER", "state:on", batteryStatusMessage, true, true);
    }

    if ((voltage < lowVoltage || voltage >= hightVoltage || voltage <= inverterVoltageShutdown) && inverterStarted) {
      actionCommand("INVERTER", "state:off", batteryStatusMessage, true, true);
    }

    createResponse(voltage, current, power, energy_kWhtoday, over_power_alarm, lower_power_alarm, humidity, temperature, true);
  } else {
    clearDisplay();
    printMessage(4, 1, "ERROR !!", false);
    printMessage(5, 1, "Failed to read modbus", true);
    createResponse(0, 0, 0, 0, 0, 0, humidity, temperature, false);
  }

  //  Solar Fan Cooling Start
  if ((int)temperature > 0 && (int)temperature >= 42) {
    if (!solarboxFanStarted) {
      Serial.println("Fan Start");
      actionCommand("COOLING_FAN", "state:on", "Start SolarBox Fan", true, false);
    }
  }

  //  Solar Fan Cooling Start
  if ((int)temperature > 0 && (int)temperature <= 38) {
    if (solarboxFanStarted) {
      Serial.println("Fan Stoped");
      actionCommand("COOLING_FAN", "state:off", "Stoped SolarBox Fan", true, false);
    }
  }

  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  return true; // repeat? true
}

void event(const char * payload, size_t length) {
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(String(payload));
  String action = root["action"];
  if (action != "") {
    Serial.printf("=====>: %s\n", payload);
    String state = root["payload"]["state"];
    String messageInfo = root["payload"]["messageInfo"];
    bool isAuto = root["payload"]["isAuto"];

    String actionName = "";
    if (action == "INVERTER") {
      actionName = "TBE Inverter 4000w";
      digitalWrite(INVERTER, (state == "state:on") ? LOW : HIGH);
      inverterStarted = (state == "state:on");
    }

    if (action == "COOLING_FAN") {
      actionName = "Cooling Fans";
      digitalWrite(COOLING_FAN, (state == "state:on") ? LOW : HIGH);
      solarboxFanStarted = (state == "state:on");
    }

    if (action == "LIGHT") {
      actionName = "Light LED";
      digitalWrite(LIGHT, (state == "state:on") ? LOW : HIGH);
    }

    if (action == "SPOTLIGHT") {
      actionName = "Spotlight";
      digitalWrite(SPOTLIGHT, (state == "state:on") ? LOW : HIGH);
    }

    if (action == "CHECKING") {
      checkCurrentStatus(false);
    }

    if (action == "setInverterVoltageStart" && state != "") {
      inverterVoltageStart = state.toFloat();
    }

    if (action == "setInverterVoltageShutdown" && state != "") {
      inverterVoltageShutdown = state.toFloat();
    }

    if (action == "ENERGY_RESET") {
      actionName = "Energy Reset";
      pzem.resetEnergy();
    }

    if (actionName != "") {
      checkCurrentStatus(true);

      String relayStatus = String((state == "state:on") ? "เปิด" : "ปิด");
      String msq = (messageInfo != "") ? messageInfo : "";
      msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
      msq += (isAuto) ? " (Auto)" : " (Manual)";
      if (enableLineNotify)
        Line_Notify(msq);

      if (isDebugMode)
        Serial.println("[" + actionName + "]: " + relayStatus);
    }
  }
}

String createResponse(float voltage, float current, float power, float energy, uint16_t over_power_alarm, uint16_t lower_power_alarm, float humidity, float temperature, bool isOledPrint) {
  //For ArduinoJson 6.X
  //  StaticJsonDocument<1024> doc;
  //  doc["data"] = "ESP32";
  //  doc["last_Update"] = NowString();
  //  JsonObject object = doc.createNestedObject("sensor");

  //  object["voltage_usage"] = voltage;
  //  object["current_usage"] = current;
  //  object["active_power"] = power;
  //  object["active_energy"] = energy;
  //  object["over_power_alarm"] = over_power_alarm;
  //  object["lower_power_alarm"] = lower_power_alarm;

  //For ArduinoJson 6.X
  //serializeJson(doc, output);


  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceId"] = deviceId;
  root["deviceName"] = deviceName;
  root["time"] = NowString();

  JsonObject& data = root.createNestedObject("sensor");
  // PZEM-017
  data["voltage_usage"] =   voltage;
  data["current_usage"] =  current;
  data["active_power"] =  power;
  data["active_energy"] =   energy;
  data["over_power_alarm"] = over_power_alarm;
  data["lower_power_alarm"] = lower_power_alarm;
  // DHT11
  data["humidity"] = humidity;
  data["temperature"] = temperature;
  data["heatIndex"] = dht.computeHeatIndex(temperature, humidity, false);

  String output;
  root.prettyPrintTo(output);

  FirebaseJson jsonRes;
  jsonRes.setJsonData(output);

  if (voltage > 0) {
    if (Firebase.pushJSON(firebaseData, "/data", jsonRes)) {
      Serial.println("Firebase push success");
    } else {
      Serial.println("Firebase Error: " + firebaseData.errorReason());
    }
  }

  if (isOledPrint) {
    static char outstr[15];
    oled.setTextXY(4, 1);
    oled.putString("Voltage :" + String(dtostrf(voltage, 7, 2, outstr)) + "  V");

    oled.setTextXY(5, 1);
    oled.putString("Current : " + String(dtostrf(current, 7, 3, outstr)) + " A");

    oled.setTextXY(6, 1);
    oled.putString("Power   : " + String(dtostrf(power, 7, 3, outstr)) + " W");

    oled.setTextXY(7, 1);
    oled.putString("Energy  : " + String(dtostrf(energy, 7, 3, outstr)) + " Wh");
  }

  //Publish to socket.io server
  if (enableSocketIO)
    webSocket.emit(SocketIoChannel, output.c_str());

  if (isDebugMode)
    Serial.print(output);
}

void clearDisplay() {
  for (int i = 4; i < 8; i++) {
    oled.setTextXY(i, 1);
    oled.putString("                              ");
  }
}

void printMessage(int X, int Y, String message, bool isPrintLn) {
  oled.setTextXY(X, Y);
  oled.putString(message);
  if (isPrintLn)
    Serial.println(message);
  else
    Serial.print(message);
}

void actionCommand(String action, String payload, String messageInfo, bool isAuto, bool isSendNotify) {
  Serial.println("State => " + payload);
  if (action == "") return;

  String actionName = "";
  if (action == "INVERTER") {
    actionName = "TBE Inverter 4000w";
    digitalWrite(INVERTER, (payload == "state:on") ? LOW : HIGH);
    inverterStarted = (payload == "state:on");
  }

  if (action == "COOLING_FAN") {
    actionName = "Cooling Fans";
    digitalWrite(COOLING_FAN, (payload == "state:on") ? LOW : HIGH);
    solarboxFanStarted = (payload == "state:on");
  }

  if (action == "LIGHT") {
    actionName = "Light LED";
    digitalWrite(LIGHT, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "SPOTLIGHT") {
    actionName = "Spotlight";
    digitalWrite(SPOTLIGHT, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "CHECKING") {
    checkCurrentStatus(false);
  }

  if (action == "setInverterVoltageStart" && payload != "") {
    inverterVoltageStart = payload.toFloat();
  }

  if (action == "setInverterVoltageShutdown" && payload != "") {
    inverterVoltageShutdown = payload.toFloat();
  }

  if (action == "ENERGY_RESET") {
    actionName = "Energy Reset";
    isSendNotify = true;
    pzem.resetEnergy();
  }

  if (actionName != "") {

    checkCurrentStatus(isSendNotify);

    String relayStatus = String((payload == "state:on") ? "เปิด" : "ปิด");
    String msq = (messageInfo != "") ? messageInfo : "";
    msq += "\r\n===============\r\n- Relay Switch Status -\r\n" + actionName + ": " + relayStatus;
    msq += (isAuto) ? " (Auto)" : " (Manual)";
    if (isSendNotify)
      Line_Notify(msq);

    if (isDebugMode)
      Serial.println("[" + actionName + "]: " + relayStatus);
  }
}

void checkCurrentStatus(bool sendLineNotify) {
  // For ArduinoJson 6.X
  //  StaticJsonDocument<1024> doc;
  //  doc["data"] = "ESP8266";
  //  doc["lastUpdated"] = NowString();
  //
  //  //For Display on UI with socket.io
  //  JsonObject object = doc.createNestedObject("deviceState");
  //  object["INVERTER"] = String((digitalRead(INVERTER) == LOW) ? "ON" : "OFF");
  //  object["COOLING_FAN"] = String((digitalRead(COOLING_FAN) == LOW) ? "ON" : "OFF");
  //  object["LIGHT"] = String((digitalRead(LIGHT) == LOW) ? "ON" : "OFF");
  //  object["SPOTLIGHT"] = String((digitalRead(SPOTLIGHT) == LOW) ? "ON" : "OFF");
  //  object["inverterVoltageStart"] = inverterVoltageStart;
  //  object["inverterVoltageShutdown"] = inverterVoltageShutdown;
  //  object["IpAddress"] = WiFi.localIP().toString();
  //  String output;
  //  serializeJson(doc, output);

  StaticJsonBuffer<512> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["deviceId"] = deviceId;
  root["deviceName"] = deviceName;
  root["lastUpdated"] = NowString();

  JsonObject& data = root.createNestedObject("deviceState");
  data["INVERTER"] = String((digitalRead(INVERTER) == LOW) ? "ON" : "OFF");
  data["COOLING_FAN"] = String((digitalRead(COOLING_FAN) == LOW) ? "ON" : "OFF");
  data["LIGHT"] = String((digitalRead(LIGHT) == LOW) ? "ON" : "OFF");
  data["SPOTLIGHT"] = String((digitalRead(SPOTLIGHT) == LOW) ? "ON" : "OFF");
  data["inverterVoltageStart"] = inverterVoltageStart;
  data["inverterVoltageShutdown"] = inverterVoltageShutdown;
  data["IpAddress"] = WiFi.localIP().toString();

  String output;
  root.prettyPrintTo(output);

  if (enableSocketIO)
    webSocket.emit(SocketIoChannel, output.c_str());

  if (sendLineNotify) {
    //Send to Line Notify
    String status = "\r\nRelay Switch Status (ESP32)";
    status += "\r\nTBE Inverter 4000w: " + String((digitalRead(INVERTER) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nCooling Fans: " + String((digitalRead(COOLING_FAN) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nLight LED: " + String((digitalRead(LIGHT) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nSpotlight: " + String((digitalRead(SPOTLIGHT) == LOW) ? "เปิด" : "ปิด");
    Line_Notify(status);
  }
}

void setup_Wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  Serial.println();
  printMessage(0, 1, "WIFI Connecting...", true);
  oled.setTextXY(1, 1);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    oled.putString(".");
  }

  oled.clearDisplay();

  Serial.println();
  Serial.print("WIFI Connected ");
  String ip = WiFi.localIP().toString();
  Serial.println(ip.c_str());
  Serial.println("Socket.io Server: "); Serial.print(SOCKETIO_HOST);
  Serial.println();

  oled.setTextXY(0, 1); oled.putString("IP Addr : " + ip);
  oled.setTextXY(1, 1); oled.putString("Server  : " + String(SOCKETIO_HOST));
}

void InitialOLED() {
  Wire.begin();
  oled.init(); // Initialze SSD1306 OLED display
  //oled.setInverseDisplay();
  oled.deactivateScroll();
  oled.clearDisplay(); // Clear screen
  oled.setFont(font5x7);
  //oled.setFont(font8x8);

  for (int i = 0; i < 8; i++) {
    oled.setTextXY(i, 1);
    oled.putString("                              ");
  }
}

void setup_IpAddress() {
  IPAddress local_ip = {192, 168, 137, 144};
  IPAddress gateway = {192, 168, 137, 1};
  IPAddress subnet = {255, 255, 255, 0};
  WiFi.config(local_ip, gateway, subnet);
}

void Line_Notify(String message) {
  Serial.println("Send Line-Notify");

  if (!enableLineNotify)
    return;

  WiFiClientSecure client;
  if (!client.connect("notify-api.line.me", 443)) {
    Serial.println("connection failed");
    return;
  }

  String req = "";
  req += "POST /api/notify HTTP/1.1\r\n";
  req += "Host: notify-api.line.me\r\n";
  req += "Authorization: Bearer " + String(LINE_TOKEN) + "\r\n";
  req += "Cache-Control: no-cache\r\n";
  req += "User-Agent: ESP32\r\n";
  req += "Content-Type: application/x-www-form-urlencoded\r\n";
  req += "Content-Length: " + String(String("message=" + message).length()) + "\r\n";
  req += "\r\n";
  req += "message=" + message;

  if (isDebugMode)
    Serial.println(req);

  client.print(req);
  delay(20);

  Serial.println("-------------");
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") {
      break;
    }
    if (isDebugMode)
      Serial.println(line);
  }
  Serial.println("-------------");
}

void setUpFireBase() {
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
  Firebase.setMaxRetry(firebaseData, 3);
  Firebase.setMaxErrorQueue(firebaseData, 30);
  Firebase.enableClassicRequest(firebaseData, true);
}

void handleRelaySwitch() {
  pinMode(INVERTER, OUTPUT); digitalWrite(INVERTER, HIGH);
  pinMode(COOLING_FAN, OUTPUT); digitalWrite(COOLING_FAN, HIGH);
  pinMode(LIGHT, OUTPUT); digitalWrite(LIGHT, HIGH);
  pinMode(SPOTLIGHT, OUTPUT); digitalWrite(SPOTLIGHT, HIGH);
  pinMode(SW5, OUTPUT); digitalWrite(SW5, HIGH);
}

String NowString() {
  time_t now = time(nullptr);
  struct tm* newtime = localtime(&now);
  String tmpNow = "";
  tmpNow += String(newtime->tm_hour);
  tmpNow += ":";
  tmpNow += String(newtime->tm_min);
  tmpNow += ":";
  tmpNow += String(newtime->tm_sec);
  return tmpNow;
}

void setupTimeZone() {
  configTime(timezone * 3600, dst, ntp_server1, ntp_server2, ntp_server3);
  Serial.println("Waiting for time");
  while (!time(nullptr)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.println("Now: " + NowString());
}
