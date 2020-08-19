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

TaskHandle_t task0 = NULL;
TaskHandle_t task1;

const TickType_t xDelay = pdMS_TO_TICKS(1000);

void setup() {

  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  //timer.every(2000, readSoilMoistureSensor);


  xTaskCreatePinnedToCore(
    soiMoistureSensorTask,        /* Task function. */
    "soiMoistureSensorTask",      /* String with name of task. */
    10000,                        /* Stack size in words. */
    NULL,                         /* Parameter passed as input of the task */
    1,                            /* Priority of the task. */
    &task0,                       /* Task handle. */
    0);                           /* Cpu core */

  Serial.print("Setup: created Task priority = ");
  Serial.println(uxTaskPriorityGet(task0));

}

int moisVal = 0;
int soilMoistureReal = 0;

void loop() {
  delay(100);
}


void soiMoistureSensorTask(void *pvParam) {
  while (1) {
    moisVal = analogRead(sensorPin);
    soilMoistureReal = map(moisVal, AirValue, WaterValue, 0, 100);
    if (moisVal > 0) {
      Serial.println(moisVal);
      Serial.println("soilMoistureReal: " + String(soilMoistureReal));
    }

    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    vTaskDelay(xDelay);
  }
}
