import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import {
  faWater,
  faSyncAlt,
  faCannabis,
  faLightbulb,
  faFaucet,
} from '@fortawesome/free-solid-svg-icons';

//init module
import DailyChart from '../charts/DailyChart';
import ConsoleLogs from '../console/ConsoleLogs';
import Gauge from '../meters/Gauge';
import moment from 'moment';
import { subscribeData, unsubscribe, broadcastData } from '../socketio/client';
import './monitering.css';
import DayFlag from './DayFlag';
import { ReduceMessage, ReduceData } from '../../utils/ReduceMessage';
import { AppConfig, RelaySwitch, Device } from '../../constants/Constants';
import { ChartModel } from '../../typings/chartModel';
import { LogData } from '../../typings/logData';
import FormInput from './FormInput';
import Schedule from './Schedule';
import { isMobile } from 'react-device-detect';
import CustomButton from './CustomButton';
import useWindowSize from '../hooks/useWindowSize';

const SoiMoisture = () => {
  const [soilMoisture, setSoilMoisture] = useState<number>(0);
  const [voltageGauge, setVoltageGauge] = useState<number>(0);
  const [currentGauge, setCurrentGauge] = useState<number>(0);
  const [soilMoistureData, setSoilMoistureData] = useState<ChartModel[]>([
    {
      id: 'moisture (H)',
      color: 'hsl(157, 70%, 50%)',
      data: [],
    },
    {
      id: 'temperature (C)',
      color: 'hsl(226, 70%, 50%)',
      data: [],
    },
    {
      id: 'humidity (H %)',
      color: 'hsl(298, 70%, 50%)',
      data: [],
    },
  ]);

  const [deviceData, setDeviceData] = useState<any>([]);
  const [logs, setLogs] = useState<any>([]);
  const [deviceIpAddress, setDeviceIpAddress] = useState('');
  const [waterFallPump, setWaterFallPump] = useState(false);
  const [waterThePlants, setWaterThePlants] = useState(false);
  const [waterSprinkler, setWaterSprinkler] = useState(false);
  const [gardenLight, setGardenLight] = useState(false);
  const [livingRoomLight, setLivingRoomLight] = useState(false);

  const [disableBtnWaterFallPumpSw, setDisableBtnWaterFallPumpSw] = useState(
    false
  );
  const [disableBtnWaterThePlantsSw, setDisableBtnWaterThePlansSw] = useState(
    false
  );
  const [disableBtnWaterSprinklerSw, setDisableBtnWaterSprinklerSw] = useState(
    false
  );
  const [disableBtnGardenLightSw, setDisableBtnGardenLightSw] = useState(false);
  const [
    disableBtnLivingRoomLightSw,
    setDisableBtnLivingRoomLightSw,
  ] = useState(false);

  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);
  const formRef = useRef<any>();
  let dataLogs: LogData[] = [];
  useEffect(() => {
    const cb = (data: any) => {
      if (
        data.sensor &&
        (data.deviceName === Device.FARM_BOT ||
          data.deviceName === Device.HOME_CONTROL)
      ) {
        dataLogs.unshift({
          logLevelType: 'info',
          timestamp: moment.utc().local(),
          messages: JSON.stringify(data),
        } as LogData);

        if (data.deviceName === Device.FARM_BOT) {
          const { soilMoistureRaw } = data.sensor;
          setDeviceIpAddress(data.ipAddress);
          setSoilMoisture(soilMoistureRaw);
          setDeviceData({
            soilMoistureRaw: soilMoistureRaw,
          });
        }

        ReduceMessage(100, dataLogs);
        setLogs([...dataLogs]);
      } else if (data.sensor && data.deviceName === Device.SOLAR_BOX) {
        setTemperature(data.sensor.temperature);
        setHumidity(data.sensor.humidity);
        setVoltageGauge(data.sensor.voltage_usage);
        setCurrentGauge(data.sensor.current_usage);
      }

      if (data.deviceState && data.deviceName === Device.FARM_BOT) {
        const { WATER_THE_PLANTS, WATER_SPRINKLER } = data.deviceState;
        setWaterThePlants(WATER_THE_PLANTS === 'ON');
        setWaterSprinkler(WATER_SPRINKLER === 'ON');

        setDisableBtnWaterThePlansSw(false);
        setDisableBtnWaterSprinklerSw(false);
      } else if (data.deviceState && data.deviceName === Device.HOME_CONTROL) {
        const {
          LIVINGROOM_LIGHT,
          GARDEN_LIGHT,
          WATER_FALL_PUMP,
        } = data.deviceState;
        setLivingRoomLight(LIVINGROOM_LIGHT === 'ON');
        setGardenLight(GARDEN_LIGHT === 'ON');
        setWaterFallPump(WATER_FALL_PUMP === 'ON');

        setDisableBtnWaterFallPumpSw(false);
        setDisableBtnLivingRoomLightSw(false);
        setDisableBtnGardenLightSw(false);
      }
    };
    subscribeData(cb);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    broadcastData(RelaySwitch.CHECKING, '');
  }, []);

  const maxArr = isMobile ? 4 : 7;
  useEffect(() => {
    let chartData = [...soilMoistureData];
    if (deviceData.soilMoistureRaw) {
      const moistureIndex = 0;
      ReduceData(maxArr, chartData[moistureIndex].data);
      chartData[moistureIndex].data = [
        ...chartData[moistureIndex].data,
        {
          x: moment.utc().format(AppConfig.dateFormat),
          y: deviceData.soilMoistureRaw,
        },
      ];
    }

    if (temperature) {
      const temperatureIndex = 1;
      ReduceData(maxArr, chartData[temperatureIndex].data);
      chartData[temperatureIndex].data = [
        ...chartData[temperatureIndex].data,
        {
          x: moment.utc().format(AppConfig.dateFormat),
          y: temperature,
        },
      ];
    }

    if (humidity) {
      const humidityIndex = 2;
      ReduceData(maxArr, chartData[humidityIndex].data);
      chartData[humidityIndex].data = [
        ...chartData[humidityIndex].data,
        {
          x: moment.utc().format(AppConfig.dateFormat),
          y: humidity,
        },
      ];
    }

    setSoilMoistureData(chartData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceData, temperature, humidity]);

  const handleSwitch = (sw: string) => {
    switch (sw) {
      case RelaySwitch.LIVINGROOM_LIGHT:
        broadcastData(RelaySwitch.LIVINGROOM_LIGHT, {
          state: !livingRoomLight ? 'state:on' : 'state:off',
        });
        setDisableBtnLivingRoomLightSw(true);
        break;
      case RelaySwitch.GARDEN_LIGHT:
        broadcastData(RelaySwitch.GARDEN_LIGHT, {
          state: !gardenLight ? 'state:on' : 'state:off',
        });
        setDisableBtnGardenLightSw(true);
        break;
      case RelaySwitch.WATER_FALL_PUMP:
        broadcastData(RelaySwitch.WATER_FALL_PUMP, {
          state: !waterFallPump ? 'state:on' : 'state:off',
        });
        setDisableBtnWaterFallPumpSw(true);
        break;
      case RelaySwitch.WATER_THE_PLANTS:
        broadcastData(RelaySwitch.WATER_THE_PLANTS, {
          state: !waterThePlants ? 'state:on' : 'state:off',
          delay: Number(formRef.current.value),
        });
        setDisableBtnWaterThePlansSw(true);
        break;
      case RelaySwitch.WATER_SPRINKLER:
        broadcastData(RelaySwitch.WATER_SPRINKLER, {
          state: !waterSprinkler ? 'state:on' : 'state:off',
          delay: Number(formRef.current.value),
        });
        setDisableBtnWaterSprinklerSw(true);
        break;

      default:
        break;
    }
  };

  const dataText = (moisVal: number) => {
    let msg, color;
    if (moisVal >= 1000) {
      msg = 'Sensor is not in the Soil or DISCONNECTED';
      color = 'black';
    } else if (moisVal < 1000 && moisVal >= 600) {
      msg = 'Soil is DRY';
      color = 'red';
    } else if (moisVal < 600 && moisVal >= 370) {
      msg = 'Soil is HUMID';
      color = 'orange';
    } else if (moisVal < 370 && moisVal >= 20) {
      msg = 'Sensor in WATER';
      color = 'white';
    } else if (moisVal < 10 && moisVal > 0) {
      msg = 'Sensor is not in the Soil or DISCONNECTED';
      color = 'red';
    }

    return (
      <text
        x='8'
        y='24'
        style={{ fill: color, fontSize: '0.16em', fontWeight: 'bold' }}
      >
        {msg}
      </text>
    );
  };

  const size = useWindowSize();
  return (
    <>
      <Row>
        <Col
          sm='3'
          style={{
            background: 'linear-gradient(45deg, black, transparent)',
          }}
        >
          <br />

          <div>
            <CustomButton
              title='Living Room LI'
              disabled={disableBtnLivingRoomLightSw}
              onClick={() => handleSwitch(RelaySwitch.LIVINGROOM_LIGHT)}
              flagStatus={livingRoomLight}
              icon={faLightbulb}
              color='warning'
            />
          </div>

          <div>
            <CustomButton
              title='Garden Light'
              disabled={disableBtnGardenLightSw}
              onClick={() => handleSwitch(RelaySwitch.GARDEN_LIGHT)}
              flagStatus={gardenLight}
              icon={faLightbulb}
              color='success'
            />
          </div>

          <div>
            <CustomButton
              title='Waterfall Pump'
              disabled={disableBtnWaterFallPumpSw}
              onClick={() => handleSwitch(RelaySwitch.WATER_FALL_PUMP)}
              flagStatus={waterFallPump}
              icon={faWater}
              color='info'
            />
          </div>

          <div>
            <CustomButton
              title='Water the plants'
              disabled={disableBtnWaterThePlantsSw}
              onClick={() => handleSwitch(RelaySwitch.WATER_THE_PLANTS)}
              flagStatus={waterThePlants}
              icon={faCannabis}
              color='primary'
            />
          </div>

          <div>
            <CustomButton
              title='Water Sprinkler'
              disabled={disableBtnWaterSprinklerSw}
              onClick={() => handleSwitch(RelaySwitch.WATER_SPRINKLER)}
              flagStatus={waterSprinkler}
              icon={faFaucet}
              color='success'
            />
          </div>

          <br />
          <div style={{ color: 'white' }}>
            <strong style={{ textAlign: 'center' }}>Soil Moisture State</strong>
          </div>
          <div className='single-chart' style={{ color: 'white' }}>
            <svg viewBox='0 0 36 36' className='circular-chart green'>
              <path
                className='circle-bg'
                d='M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831'
              />
              <path
                className='circle'
                strokeDasharray={soilMoisture.toFixed(2) + ', 100'}
                d='M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831'
              />
              {temperature && (
                <text
                  x='15'
                  y='10'
                  style={{ fill: 'yellow', fontSize: '0.14em' }}
                >
                  {temperature} C&deg;
                </text>
              )}
              <text
                x='18'
                y='20.35'
                className='percentage'
                style={{ fontSize: '0.7em' }}
              >
                {soilMoisture}
              </text>
              {dataText(soilMoisture)}
              <text
                x='11'
                y='27'
                style={{ fill: 'yellow', fontSize: '0.13em' }}
              >
                {voltageGauge.toFixed(2) +
                  'V / ' +
                  currentGauge.toFixed(2) +
                  'A'}
              </text>
            </svg>
            <DayFlag temperature={temperature} humidity={humidity} />
            <br />
            <div
              style={{
                textAlign: 'center',
                fontSize: 'x-small',
                marginTop: '20px',
              }}
            >
              <strong>Device IP: {deviceIpAddress}</strong>
            </div>
          </div>

          <div style={{ marginBottom: 37 }}>
            <CustomButton
              title='Energy Reset'
              isBlik={false}
              onClick={() => broadcastData(RelaySwitch.RESET_ENERGY, '')}
              icon={faSyncAlt}
              color='danger'
            />
          </div>
        </Col>
        <Col sm='9'>
          <Container>
            <Row>
              <Col
                style={{
                  width: '100%',
                  height: 310,
                  marginTop: 10,
                  marginBottom: 20,
                }}
                sm='12'
              >
                <DailyChart
                  key='soilmoisture'
                  data={soilMoistureData}
                  title='Smart Garden with IoT Plant Monitoring System'
                  legend='Sensor data'
                  colors='category10'
                  isDecimalFormat={false}
                />
              </Col>
            </Row>
            <Row>
              <Col
                sm={size.width < 407 ? '5' : '7'}
                style={{ textAlign: 'center' }}
              >
                <FormInput formRef={formRef} defaultValue={30} />
                <br />
                <Schedule />
                <br />
              </Col>
              <Col
                sm={size.width < 407 ? '7' : '5'}
                style={{ textAlign: 'center' }}
              >
                <Gauge
                  chartTitle='Soil Moisture'
                  min={0}
                  max={1000}
                  height={240}
                  units='H'
                  plotBands={[
                    {
                      from: 0,
                      to: 370,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 370,
                      to: 600,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 600,
                      to: 1000,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                  ]}
                  majorTicks={[
                    0,
                    100,
                    200,
                    300,
                    400,
                    500,
                    600,
                    700,
                    800,
                    900,
                    1000,
                  ]}
                  value={soilMoisture}
                />

                <Gauge
                  chartTitle='Temperature'
                  min={0}
                  max={100}
                  height={240}
                  units='C&deg;'
                  plotBands={[
                    {
                      from: 0,
                      to: 15,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 15,
                      to: 35,
                      color: 'rgba(10, 10, 10, .25)',
                    },
                    {
                      from: 35,
                      to: 60,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 60,
                      to: 100,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                  ]}
                  majorTicks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  value={temperature}
                />

                <Gauge
                  chartTitle='Humidity'
                  min={0}
                  max={100}
                  height={240}
                  units='H (%)'
                  plotBands={[
                    {
                      from: 0,
                      to: 30,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                    {
                      from: 30,
                      to: 50,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 50,
                      to: 70,
                      color: 'rgba(10, 10, 10, .25)',
                    },

                    {
                      from: 70,
                      to: 100,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                  ]}
                  majorTicks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  value={humidity}
                />
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
      <Row>
        <Col>
          <ConsoleLogs logs={logs} />
        </Col>
      </Row>
    </>
  );
};

export default SoiMoisture;
