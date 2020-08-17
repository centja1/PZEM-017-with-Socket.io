#include <Arduino.h>
#include <time.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <arduino-timer.h>
#include <HardwareSerial.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h>
#include <string.h>
#include <cstdlib>


int sensorPin = 2;
const int AirValue = 1895;   //you need to replace this value with Value_1
const int WaterValue = 900;  //you need to replace this value with Value_2

auto timer = timer_create_default();
Timer<> default_timer;

void setup() {

  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  timer.every(2000, readSoilMoistureSensor);
}

int moisVal = 0;
int soilMoistureReal = 0;

void loop() {
  timer.tick();
}




bool readSoilMoistureSensor(void *) {
  //moisVal = digitalRead(sensorPin);
  moisVal = analogRead(sensorPin);
  soilMoistureReal = map(moisVal, AirValue, WaterValue, 0, 100);
  if (moisVal > 0) {
    Serial.println(moisVal);
    Serial.println("soilMoistureReal: " + String(soilMoistureReal));
  }

  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  return true; // repeat? true
}
