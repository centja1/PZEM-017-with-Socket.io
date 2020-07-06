import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWater,
  faCheckCircle,
  faSyncAlt,
  faTint,
} from '@fortawesome/free-solid-svg-icons';

//init module
import DailyChart from '../charts/DailyChart';
import ConsoleLogs from '../console/ConsoleLogs';
import Gauge from '../meters/Gauge';
import moment from 'moment';
import { subscribeData, unsubscribe, broadcastData } from '../socketio/client';
import './monitering.css';
import Blik from '../common/Blik';
import DayFlag from './DayFlag';
import { ReduceMessage, ReduceData } from '../../utils/ReduceMessage';
import { RangePercentage } from '../../utils/RangePercentage';
import { AppConfig, RelaySwitch } from '../../constants/Constants';
import { ChartModel } from '../../typings/chartModel';
import { LogData } from '../../typings/logData';
import FormInput from './FormInput';
import Schedule from './Schedule';

interface SoiMoistureProps {
  deviceName: string;
}
const SoiMoisture = (props: SoiMoistureProps) => {
  const [soilMoisture, setSoilMoisture] = useState<number>(0);
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
  const [waterfallPumpSwitch, setWaterfallPumpSwitch] = useState(false);
  const [waterSprinkler, setWaterSprinkler] = useState(false);
  const [disableBtnWaterfallPumpSw, setDisableBtnWaterfallPumpSw] = useState(
    false
  );
  const [disableBtnWaterSprinklerSw, setDisableBtnWaterSprinklerSw] = useState(
    false
  );
  const [percentageMoisture, setPercentageMoisture] = useState(0);
  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);
  const formRef = useRef<any>();
  let dataLogs: LogData[] = [];
  useEffect(() => {
    const cb = (data: any) => {
      // console.log('[data]:', data);
      if (data.sensor && data.deviceName === props.deviceName) {
        const { moisture } = data.sensor;
        setDeviceIpAddress(data.ipAddress);

        dataLogs.unshift({
          logLevelType: 'info',
          timestamp: moment.utc().local(),
          messages: JSON.stringify(data),
        } as LogData);

        setSoilMoisture(moisture);
        setDeviceData({
          moisture: moisture,
        });

        ReduceMessage(100, dataLogs);
        setLogs([...dataLogs]);
      } else if (data.sensor && data.deviceName === 'ESP32') {
        setTemperature(data.sensor.temperature);
        setHumidity(data.sensor.humidity);
      } else if (data.deviceState && data.deviceName === props.deviceName) {
        const {
          IpAddress,
          WATER_FALL_PUMP,
          WATER_SPRINKLER,
        } = data.deviceState;

        setDeviceIpAddress(IpAddress);
        setWaterfallPumpSwitch(WATER_FALL_PUMP === 'ON');
        setWaterSprinkler(WATER_SPRINKLER === 'ON');

        setDisableBtnWaterfallPumpSw(false);
        setDisableBtnWaterSprinklerSw(false);

        //console.log(data.deviceState);
      }
    };
    subscribeData(cb);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    broadcastData(RelaySwitch.CHECKING, '');
  }, []);

  const maxArr = 6;
  useEffect(() => {
    let chartData = [...soilMoistureData];
    if (deviceData.moisture) {
      const moistureIndex = 0;
      setPercentageMoisture(RangePercentage(deviceData.moisture, 0, 1000, 100));
      ReduceData(maxArr, chartData[moistureIndex].data);
      chartData[moistureIndex].data = [
        ...chartData[moistureIndex].data,
        {
          x: moment.utc().format(AppConfig.dateFormat),
          y: deviceData.moisture,
        },
      ];
    }

    if (temperature) {
      const temperatureIndex = 1;
      //setPercentageMoisture(RangePercentage(deviceData.moisture, 0, 1000, 100));
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
      //setPercentageMoisture(RangePercentage(deviceData.moisture, 0, 1000, 100));
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

  const handleSwitch = (sw: number) => {
    switch (sw) {
      case 1:
        broadcastData(RelaySwitch.WATER_FALL_PUMP, {
          state: !waterfallPumpSwitch ? 'state:on' : 'state:off',
        });
        setDisableBtnWaterfallPumpSw(true);
        break;
      case 2:
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
            {/* {waterfallPumpSwitch ? "ON " : "OFF "}{" "} */}
            <Button
              disabled={disableBtnWaterfallPumpSw}
              onClick={() => handleSwitch(1)}
              color='info'
              style={{ margin: 5, width: 200, height: 50 }}
            >
              Waterfall Pump <FontAwesomeIcon icon={faWater} size='lg' />
              {Blik(waterfallPumpSwitch)}
            </Button>
          </div>
          <div>
            {/* {waterSprinkler ? "ON " : "OFF "} */}
            <Button
              disabled={disableBtnWaterSprinklerSw}
              onClick={() => handleSwitch(2)}
              color='success'
              style={{ margin: 5, width: 200, height: 50 }}
            >
              Water Sprinkler <FontAwesomeIcon icon={faTint} size='lg' />
              {Blik(waterSprinkler)}
            </Button>
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
                stroke-dasharray={percentageMoisture.toFixed(2) + ', 100'}
                d='M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831'
              />
              <text x='18' y='20.35' className='percentage'>
                {percentageMoisture.toFixed(1) + '%'}
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
          <div>
            <Button
              onClick={() => broadcastData(RelaySwitch.CHECKING, '')}
              color='secondary'
              style={{ margin: 5, width: 200, height: 50 }}
            >
              Check <FontAwesomeIcon icon={faCheckCircle} size='lg' />
            </Button>
          </div>

          <div>
            <Button
              onClick={() => broadcastData(RelaySwitch.RESET_ENERGY, '')}
              color='danger'
              style={{ margin: 5, width: 200, height: 50 }}
            >
              Energy Reset <FontAwesomeIcon icon={faSyncAlt} size='lg' />
            </Button>
          </div>
        </Col>
        <Col sm='9'>
          <Container>
            <Row>
              <Col
                style={{ width: '100%', height: 350, marginTop: 10 }}
                sm='12'
              >
                <DailyChart
                  data={soilMoistureData}
                  title='Soil Moisture Monitoring'
                  legend='Sensor data'
                  colors='category10'
                  isDecimalFormat={false}
                />
              </Col>
            </Row>
            <Row>
              <Col sm='4' style={{ textAlign: 'center' }}>
                <Gauge
                  chartTitle='Soil Moisture'
                  min={0}
                  max={1000}
                  //height={230}
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
              </Col>
              <Col sm='4' style={{ textAlign: 'right' }}>
                <FormInput formRef={formRef} />
              </Col>
              <Col sm='4' style={{ textAlign: 'center' }}>
                <Schedule />
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
