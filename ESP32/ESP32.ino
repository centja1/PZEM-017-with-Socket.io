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

*/

#include <Arduino.h>
#include <time.h>
#include<WiFi.h>
#include <WiFiClientSecure.h>
#include "FirebaseESP32.h"
#include <HardwareSerial.h>
#include "PZEM017.h"
#include <SocketIOClient.h>
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

// Config time
int timezone = 7;
char ntp_server1[20] = "ntp.ku.ac.th";
char ntp_server2[20] = "fw.eng.ku.ac.th";
char ntp_server3[20] = "time.uni.net.th";
int dst = 0;

float inverterVoltageStart = 13.10;
float inverterVoltageShutdown = 11.20;
float hightVoltage = 13.80;
float lowVoltage = 10.50;

bool isDebugMode = true;
bool enableLineNotify = true;
bool enableSocketIO = true;

WiFiServer server(80);

SocketIOClient socket;
FirebaseData firebaseData;
extern String RID;
extern String Rname;
extern String Rcontent;

// OLED
// 21 SDA
// 22 SCK/SCL

// PZEM - 017
// RX 16
// TX 17

// DHT11
int DHTpin = 15;

// Relay Switch
int SW1 = 27;
int SW2 = 26;
int SW3 = 25;
int SW4 = 33;
int SW5 = 32;

//Indicates that the master needs to read 8 registers with slave address 0x01 and the start address of the register is 0x0000.
static uint8_t pzemSlaveAddr = 0x01; // PZEM default address

//Make sure RX (16) & TX (17) is connected jumper
PZEM017 pzem(&Serial2, pzemSlaveAddr, 9600);
DHTesp dht;

void setup() {
  // OLED Display
  InitialOLED();

  Serial.begin(115200);
  setup_Wifi();

  //pzem.setAddress(0x02);
  pzem.setCurrentShunt(1);
  //pzem.setLOWVoltageAlarm(5);
  //pzem.setHIVoltageAlarm(48);

  dht.setup(DHTpin, DHTesp::DHT11); //for DHT11 Connect DHT sensor to GPIO 15
  pinMode(LED_BUILTIN, OUTPUT);
  if (!socket.connect(SOCKETIO_HOST, SOCKETIO_PORT)) {
    Serial.println("connection failed");
  }
  if (socket.connected()) {
    socket.send("connection", "message", "Connected !!!!");
  }

  setupTimeZone();
  setUpFireBase();
  handleRelaySwitch();
}

bool inverterStarted = false;
bool solarboxFanStarted = false;
String batteryStatusMessage;

void loop() {

  if (!socket.connected()) {
    socket.connect(SOCKETIO_HOST, SOCKETIO_PORT);
    Serial.println("Socket.io reconnecting...");
    delay(2000);
  }

  if (isDebugMode)
    pzem.getSlaveParameters();

  // pzem.getPowerAlarm();

  // PZEM-017
  float voltage = !isnan(pzem.voltage()) ? pzem.voltage() : 0;
  float current = !isnan(pzem.current()) ? pzem.current() : 0;
  float power = !isnan(pzem.power()) ? pzem.power() * 10 : 0;
  float energy = !isnan(pzem.energy()) ? pzem.energy() : 0;
  uint16_t over_power_alarm = pzem.VoltHighAlarm();
  uint16_t lower_power_alarm = pzem.VoltLowAlarm();
  uint16_t powerAlarm = pzem.getPowerAlarm();
  // DHT11
  float humidity = !isnan(dht.getHumidity()) ? dht.getHumidity() : 0;
  float temperature = !isnan(dht.getTemperature()) ? dht.getTemperature() : 0;

  oled.setTextXY(2, 1);
  oled.putString("- S1:" + String((digitalRead(SW1) == LOW) ? "ON" : "OFF") + " S2:" + String((digitalRead(SW2) == LOW) ? "ON" : "OFF") + " S3:" + String((digitalRead(SW3) == LOW) ? "ON" : "OFF") + " -");

  if (voltage > 3 && voltage < 300) {
    digitalWrite(LED_BUILTIN, HIGH);
    //Build Messages For Line Notify
    batteryStatusMessage = "\r\n===============\r\n - Battery Status - \r\n";
    batteryStatusMessage += "VOLTAGE: " + String(voltage) + "V\r\n";
    batteryStatusMessage += "CURRENT: " + String(current) + "A\r\n";
    batteryStatusMessage += "POWER: " + String(power) + "W\r\n";
    batteryStatusMessage += "ENERGY: " + String(energy) + "WH";

    if ((voltage >= inverterVoltageStart && voltage <= hightVoltage) &&  !inverterStarted) {
      actionCommand("SW1", "state:on", batteryStatusMessage, true, true);
    }

    if ((voltage < lowVoltage || voltage >= hightVoltage || voltage <= inverterVoltageShutdown) && inverterStarted) {
      actionCommand("SW1", "state:off", batteryStatusMessage, true, true);
    }

    createResponse(voltage, current, power, energy, over_power_alarm, lower_power_alarm, humidity, temperature, true);

  } else {
    clearDisplay();
    printMessage(4, 1, "ERROR !!", false);
    printMessage(5, 1, "Failed to read modbus", true);
    createResponse(0, 0, 0, 0, 0, 0, humidity, temperature, false);
  }

  if (!socket.connected()) {
    socket.connect(SOCKETIO_HOST, SOCKETIO_PORT);
    clearDisplay();
    printMessage(4, 1, "Socket.io reconnecting...", false);
    delay(2000);
  }

  if (socket.monitor() && RID == SocketIoChannel && socket.connected()) {
    actionCommand(Rname, Rcontent, "", false, true);
  }

  //Shutdown Inverter on 15:00
  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);
  if (p_tm->tm_hour == 15 && p_tm->tm_min == 0 && p_tm->tm_sec == 0) {
    actionCommand("SW1", "state:off", "Invert หยุดทำงาน ที่เวลา 15:00", true, true);
  }

  //Shutdown Inverter on 16:30
  if (p_tm->tm_hour == 16 && p_tm->tm_min == 30 && p_tm->tm_sec == 0) {
    actionCommand("SW1", "state:off", "", true, false);
    actionCommand("SW2", "state:off", " ", true, false);
  }

  //  Solar Fan Cooling Start
  if ((int)temperature >= 40) {
    if (!solarboxFanStarted) {
      Serial.println("Fan Start");
      actionCommand("SW2", "state:on", "Start SolarBox Fan", true, true);
    }
  }

  //  Solar Fan Cooling Start
  if ((int)temperature <= 38) {
    if (solarboxFanStarted) {
      Serial.println("Fan Stoped");
      actionCommand("SW2", "state:off", "Stoped SolarBox Fan", true, true);
    }
  }

  // Reset FirebaseData per day
  if (p_tm->tm_hour == 23 && p_tm->tm_min == 59)   {
    if (Firebase.deleteNode(firebaseData, "/data")) {
      Serial.print("delete /data failed:");
      Serial.println("Firebase Error: " + firebaseData.errorReason());
    }
  }

  delay(2000);
  digitalWrite(LED_BUILTIN, LOW);
}


String createResponse(float voltage, float current, float power, float energy, uint16_t over_power_alarm, uint16_t lower_power_alarm, float humidity, float temperature, bool isOledPrint) {
  //For ArduinoJson 6.X
  //  StaticJsonDocument<1024> doc;
  //  doc["data"] = "ESP8266";
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
    socket.sendJSON(SocketIoChannel, output);

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

String header;
void httpServer() {
  WiFiClient client = server.available();
  if (client) {
    Serial.println("New Client.");
    String currentLine = "";
    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        Serial.write(c);
        header += c;
        if (c == '\n') {
          // if the current line is blank, you got two newline characters in a row.
          // that's the end of the client HTTP request, so send a response:
          if (currentLine.length() == 0) {
            // HTTP headers always start with a response code (e.g. HTTP/1.1 200 OK)
            // and a content-type so the client knows what's coming, then a blank line:
            client.println("HTTP/1.1 200 OK");
            client.println("Content-type:text/html");
            client.println("Connection: close");
            client.println();

            // turns the GPIOs on and off
            if (header.indexOf("GET /26/on") >= 0) {
              Serial.println("GPIO 26 on");
              //output26State = "on";
              // digitalWrite(output26, HIGH);
            } else if (header.indexOf("GET /26/off") >= 0) {
              Serial.println("GPIO 26 off");
              // output26State = "off";
              // digitalWrite(output26, LOW);
            } else if (header.indexOf("GET /27/on") >= 0) {
              //Serial.println("GPIO 27 on");
              // output27State = "on";
              //digitalWrite(output27, HIGH);
            } else if (header.indexOf("GET /27/off") >= 0) {
              Serial.println("GPIO 27 off");
              // output27State = "off";
              // digitalWrite(output27, LOW);
            }

            // Display the HTML web page
            client.println("<!DOCTYPE html><html>");
            client.println("<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
            client.println("<link rel=\"icon\" href=\"data:,\">");
            // CSS to style the on/off buttons
            // Feel free to change the background-color and font-size attributes to fit your preferences
            client.println("<style>html { font-family: Helvetica; display: inline-block; margin: 0px auto; text-align: center;}");
            client.println(".button { background-color: #4CAF50; border: none; color: white; padding: 16px 40px;");
            client.println("text-decoration: none; font-size: 30px; margin: 2px; cursor: pointer;}");
            client.println(".button2 {background-color: #555555;}</style></head>");

            // Web Page Heading
            client.println("<body><h1>ESP32 Web Server</h1>");

            // Display current state, and ON/OFF buttons for GPIO 26
            //client.println("<p>GPIO 26 - State " + output26State + "</p>");
            client.println("<p>GPIO 26 - State xxxxxxxxx</p>");
            // If the output26State is off, it displays the ON button
            // if (output26State == "off") {
            //   client.println("<p><a href=\"/26/on\"><button class=\"button\">ON</button></a></p>");
            //  } else {
            //   client.println("<p><a href=\"/26/off\"><button class=\"button button2\">OFF</button></a></p>");
            // }

            // Display current state, and ON/OFF buttons for GPIO 27
            //client.println("<p>GPIO 27 - State " + output27State + "</p>");
            // If the output27State is off, it displays the ON button
            // if (output27State == "off") {
            //   client.println("<p><a href=\"/27/on\"><button class=\"button\">ON</button></a></p>");
            // } else {
            //   client.println("<p><a href=\"/27/off\"><button class=\"button button2\">OFF</button></a></p>");
            // }
            client.println("</body></html>");

            // The HTTP response ends with another blank line
            client.println();
            break;
          } else {
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c;
        }
      }
    }
    // Clear the header variable
    header = "";
    // Close the connection
    client.stop();
    Serial.println("Client disconnected.");
    Serial.println("");
  }
}

void actionCommand(String action, String payload, String messageInfo, bool isAuto, bool isSendNotify) {
  Serial.println("State => " + payload);
  if (action == "") return;

  String actionName = "";
  if (action == "SW1") {
    actionName = "TBE Inverter 4000w";
    digitalWrite(SW1, (payload == "state:on") ? LOW : HIGH);
    inverterStarted = (payload == "state:on");
  }

  if (action == "SW2") {
    actionName = "Cooling Fans";
    digitalWrite(SW2, (payload == "state:on") ? LOW : HIGH);
    solarboxFanStarted = (payload == "state:on");
  }

  if (action == "SW3") {
    actionName = "Waterfall Pump";
    digitalWrite(SW3, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "SW4") {
    actionName = "Water Sprinkler";
    digitalWrite(SW4, (payload == "state:on") ? LOW : HIGH);
  }

  if (action == "checking") {
    checkCurrentStatus(false);
  }

  if (action == "setInverterVoltageStart" && payload != "") {
    inverterVoltageStart = payload.toFloat();
  }

  if (action == "setInverterVoltageShutdown" && payload != "") {
    inverterVoltageShutdown = payload.toFloat();
  }

  if (action == "resetEnergy") {
    pzem.resetEnergy();
  }

  if (actionName != "") {
    checkCurrentStatus(true);

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
  //  object["SW1"] = String((digitalRead(SW1) == LOW) ? "ON" : "OFF");
  //  object["SW2"] = String((digitalRead(SW2) == LOW) ? "ON" : "OFF");
  //  object["SW3"] = String((digitalRead(SW3) == LOW) ? "ON" : "OFF");
  //  object["SW4"] = String((digitalRead(SW4) == LOW) ? "ON" : "OFF");
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
  data["SW1"] = String((digitalRead(SW1) == LOW) ? "ON" : "OFF");
  data["SW2"] = String((digitalRead(SW2) == LOW) ? "ON" : "OFF");
  data["SW3"] = String((digitalRead(SW3) == LOW) ? "ON" : "OFF");
  data["SW4"] = String((digitalRead(SW4) == LOW) ? "ON" : "OFF");
  data["inverterVoltageStart"] = inverterVoltageStart;
  data["inverterVoltageShutdown"] = inverterVoltageShutdown;
  data["IpAddress"] = WiFi.localIP().toString();

  String output;
  root.prettyPrintTo(output);

  if (enableSocketIO)
    socket.sendJSON(SocketIoChannel, output);

  if (sendLineNotify) {
    //Send to Line Notify
    String status = "\r\nRelay Switch Status";
    status += "\r\nTBE Inverter 4000w: " + String((digitalRead(SW1) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nCooling Fans: " + String((digitalRead(SW2) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nWaterfall Pump: " + String((digitalRead(SW3) == LOW) ? "เปิด" : "ปิด");
    status += "\r\nWater Sprinkler: " + String((digitalRead(SW4) == LOW) ? "เปิด" : "ปิด");
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
  req += "User-Agent: ESP8266\r\n";
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
  pinMode(SW1, OUTPUT); digitalWrite(SW1, HIGH);
  pinMode(SW2, OUTPUT); digitalWrite(SW2, HIGH);
  pinMode(SW3, OUTPUT); digitalWrite(SW3, HIGH);
  pinMode(SW4, OUTPUT); digitalWrite(SW4, HIGH);
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
