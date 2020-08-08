import React, { ReactElement, useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSyncAlt,
  faFan,
  faLightbulb,
  faBolt,
  faPlug,
} from '@fortawesome/free-solid-svg-icons';

//init module
import DailyChart from '../charts/DailyChart';
import ConsoleLogs from '../console/ConsoleLogs';
//import GaugeMeter from "../meters/gaugeMeter";
import Gauge from '../meters/Gauge';
import moment from 'moment';
import { subscribeData, unsubscribe, broadcastData } from '../socketio/client';
import './monitering.css';
import CircularChart from './CircularChart';
import { ReduceMessage, ReduceData } from '../../utils/ReduceMessage';
import { RangePercentage, RangNumber } from '../../utils/RangePercentage';
import { AppConfig, RelaySwitch } from '../../constants/Constants';
import { ChartModel, ChartSeries } from '../../typings/chartModel';
import { LogData } from '../../typings/logData';
import { powerData } from '../../typings/powerData';
import { isMobile } from 'react-device-detect';
import CustomButton from './CustomButton';
interface SolarPowerProps {
  deviceName: string;
}
export default (props: SolarPowerProps): ReactElement => {
  const [voltageGauge, setVoltageGauge] = useState<number>(0);
  const [currentGauge, setCurrentGauge] = useState<number>(0);
  const [powerGauge, setPowerGauge] = useState<number>(0);
  const [energyGauge, setEnergyGauge] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);
  const [batteryData, setBatteryData] = useState<ChartModel[]>([
    {
      id: 'power (W)',
      color: 'hsl(226, 70%, 50%)',
      data: [],
    },
    {
      id: 'current (A)',
      color: 'hsl(298, 70%, 50%)',
      data: [],
    },
    {
      id: 'volts (V)',
      color: 'hsl(157, 70%, 50%)',
      data: [],
    },
  ]);

  const [deviceData, setDeviceData] = useState<powerData>();
  const [logs, setLogs] = useState<any>([]);
  const [deviceIpAddress, setDeviceIpAddress] = useState('');
  const [inverterSwitch, setInverterSwitch] = useState(false);
  const [coolingFans, setCoolingFans] = useState(false);
  const [lightSwitch, setLightSwitch] = useState(false);
  const [spotLight, setSpotlight] = useState(false);
  const [disableBtnInverterSw, setDisableBtnInverterSw] = useState(false);
  const [disableBtnCoolingFansSw, setDisableBtnCoolingFansSw] = useState(false);
  const [disableBtnLightSw, setDisableBtnLightSw] = useState(false);
  const [disableBtnSpotlightSw, setDisableBtnSpotlightSw] = useState(false);

  const [inverterVoltageStart, setInverterVoltageStart] = useState<number>(
    13.15
  );
  const [inverterVoltageShutdown, setInverterVoltageShutdown] = useState<
    number
  >(11.2);
  const [percentageCharge, setPercentageCharge] = useState<number>(0);
  let dataLogs: LogData[] = [];

  useEffect(() => {
    const cb = (data: any) => {
      //console.log('[data]:', data);
      if (data.sensor && data.deviceName === props.deviceName) {
        dataLogs.unshift({
          logLevelType: 'info',
          timestamp: moment.utc().local(),
          messages: JSON.stringify(data),
        });

        setVoltageGauge(data.sensor.voltage_usage);
        setCurrentGauge(data.sensor.current_usage);
        setPowerGauge(data.sensor.active_power);
        setEnergyGauge(data.sensor.active_energy);
        setTemperature(data.sensor.temperature);
        setHumidity(data.sensor.humidity);

        if (data.sensor.voltage_usage)
          setDeviceData({
            voltage: data.sensor.voltage_usage,
            current: data.sensor.current_usage,
            power: data.sensor.active_power,
            energy: data.sensor.active_energy,
            time: data.time,
          });

        ReduceMessage(100, dataLogs);
        setLogs([...dataLogs]);
      }

      if (data.deviceState && data.deviceName === props.deviceName) {
        const {
          IP_ADDRESS,
          INVERTER,
          COOLING_FAN,
          LIGHT,
          SPOTLIGHT,
          inverterVoltageShutdown,
          inverterVoltageStart,
        } = data.deviceState;
        setDeviceIpAddress(IP_ADDRESS);
        setInverterSwitch(INVERTER === 'ON');
        setCoolingFans(COOLING_FAN === 'ON');
        setLightSwitch(LIGHT === 'ON');
        setSpotlight(SPOTLIGHT === 'ON');
        setInverterVoltageStart(inverterVoltageStart);
        setInverterVoltageShutdown(inverterVoltageShutdown);

        setDisableBtnInverterSw(false);
        setDisableBtnCoolingFansSw(false);
        setDisableBtnLightSw(false);
        setDisableBtnSpotlightSw(false);
      }
    };
    subscribeData(cb);
    //console.log('batteryData:', batteryData);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    broadcastData(RelaySwitch.CHECKING, '');
  }, []);

  const maxArr = isMobile ? 4 : 7;
  const maxBatteryLevel = 13.3;
  const minBatteryLevel = 10.5;
  useEffect(() => {
    const currTime = moment.utc().format(AppConfig.dateFormat);
    let chartData = [...batteryData];
    if (deviceData?.power) {
      const powerIndex = 0;
      ReduceData(maxArr, chartData[powerIndex].data);
      chartData[powerIndex].data = [
        ...chartData[powerIndex].data,
        {
          x: currTime,
          y: deviceData.power,
        } as ChartSeries,
      ];
    }

    if (deviceData?.current) {
      const currentIndex = 1;
      ReduceData(maxArr, chartData[currentIndex].data);
      chartData[currentIndex].data = [
        ...chartData[currentIndex].data,
        {
          x: currTime,
          y: deviceData.current,
        } as ChartSeries,
      ];
    }

    if (deviceData?.voltage) {
      const voltageIndex = 2;
      setPercentageCharge(
        RangePercentage(
          deviceData.voltage,
          minBatteryLevel,
          maxBatteryLevel,
          100
        )
      );
      ReduceData(maxArr, chartData[voltageIndex].data);
      chartData[voltageIndex].data = [
        ...chartData[voltageIndex].data,
        {
          x: currTime,
          y: deviceData.voltage,
        } as ChartSeries,
      ];
    }

    setBatteryData(chartData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceData]);

  const handleSwitch = (sw: number) => {
    switch (sw) {
      case 1:
        broadcastData(RelaySwitch.INVERTER, {
          state: !inverterSwitch ? 'state:on' : 'state:off',
        });
        setDisableBtnInverterSw(true);
        break;
      case 2:
        broadcastData(RelaySwitch.COOLING_FAN, {
          state: !coolingFans ? 'state:on' : 'state:off',
        });
        setDisableBtnCoolingFansSw(true);
        break;
      case 3:
        broadcastData(RelaySwitch.LIGHT, {
          state: !lightSwitch ? 'state:on' : 'state:off',
        });
        setDisableBtnLightSw(true);
        break;
      case 4:
        broadcastData(RelaySwitch.SPOTLIGHT, {
          state: !spotLight ? 'state:on' : 'state:off',
        });
        setDisableBtnSpotlightSw(true);
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
            <CustomButton
              title='Inverter'
              disabled={disableBtnInverterSw}
              onClick={() => handleSwitch(1)}
              flagStatus={inverterSwitch}
              icon={faPlug}
              color='primary'
            />
          </div>
          <div>
            <CustomButton
              title='Cooling Fans'
              disabled={disableBtnCoolingFansSw}
              onClick={() => handleSwitch(2)}
              flagStatus={coolingFans}
              icon={faFan}
              color='warning'
            />
          </div>
          <div>
            <CustomButton
              title='LED Light'
              disabled={disableBtnLightSw}
              onClick={() => handleSwitch(3)}
              flagStatus={lightSwitch}
              icon={faLightbulb}
              color='info'
            />
          </div>
          <div>
            <CustomButton
              title='Spotlight'
              disabled={disableBtnSpotlightSw}
              onClick={() => handleSwitch(4)}
              flagStatus={spotLight}
              icon={faBolt}
              color='success'
            />
          </div>
          <br />
          <div style={{ color: 'white' }}>
            <strong style={{ textAlign: 'center' }}>
              Battery State of Charge
            </strong>
          </div>
          <CircularChart
            percentageVal={percentageCharge}
            voltageGauge={voltageGauge}
            currentGauge={currentGauge}
            powerGauge={powerGauge}
            temperature={temperature}
            humidity={humidity}
            deviceIpAddress={deviceIpAddress}
            inverterVoltageStart={inverterVoltageStart}
            inverterVoltageShutdown={inverterVoltageShutdown}
          />
          <div>
            <Button
              onClick={() => broadcastData(RelaySwitch.CHECKING, '')}
              color='secondary'
              style={{ margin: 5, width: 210, height: 50 }}
            >
              Check <FontAwesomeIcon icon={faCheckCircle} size='lg' />
            </Button>
          </div>

          <div>
            <Button
              onClick={() => broadcastData(RelaySwitch.RESET_ENERGY, '')}
              color='danger'
              style={{ margin: 5, width: 210, height: 50 }}
            >
              Energy Reset <FontAwesomeIcon icon={faSyncAlt} size='lg' />
            </Button>
          </div>
        </Col>
        <Col sm='9'>
          <Container>
            <Row>
              <Col
                style={{
                  width: '100%',
                  height: 310,
                  marginTop: 7,
                  marginBottom: 10,
                }}
                sm='12'
              >
                <DailyChart
                  key='solarpower'
                  data={batteryData}
                  title='Real time Battery Monitoring'
                  legend='Solar Power'
                  colors='category10'
                  isDecimalFormat={true}
                />
              </Col>
            </Row>
            <Row style={{ paddingTop: 20 }}>
              <Col sm='4'>
                <Gauge
                  min={0}
                  max={18}
                  chartTitle='Voltage'
                  units='V'
                  plotBands={[
                    {
                      from: 0,
                      to: 9.0,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                    {
                      from: 9.1,
                      to: 12.5,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 11.1,
                      to: 14.5,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 14.5,
                      to: 18,
                      color: 'rgba(10, 10, 10, .25)',
                    },
                  ]}
                  majorTicks={RangNumber(0, 18)}
                  value={voltageGauge}
                />

                {/* <GaugeMeter title="Voltage" name="ssss" chartTitle="Voltage (V)"
                      min={0}
                      max={18}
                      data={voltageGauge}
                      plotBands={[{
                        from: 11.1,
                        to: 14.5,
                        color: '#55BF3B' // green
                      }, {
                        from: 14.6,
                        to: 18,
                        color: '#DDDF0D' // yellow
                      }, {
                        from: 11.0,
                        to: 0,
                        color: '#DF5353' // red
                      }]}
                    /> */}
              </Col>
              <Col sm='4'>
                <Gauge
                  chartTitle='Current'
                  min={0}
                  max={20}
                  units='A'
                  plotBands={[
                    {
                      from: 0,
                      to: 4,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 4,
                      to: 8,
                      color: 'rgba(10, 10, 10, .25)',
                    },
                    {
                      from: 8,
                      to: 14,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 14,
                      to: 20,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                  ]}
                  // majorTicks={RangNumber(0, 20)}
                  majorTicks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]}
                  value={currentGauge}
                />
                {/* <GaugeMeter
                      title="Current"
                      name="ssss"
                      chartTitle="Current (A)"
                      min={0}
                      max={10}
                      data={currentGauge}
                      plotBands={[
                        {
                          from: 0,
                          to: 6,
                          color: "#55BF3B" // green
                        },
                        {
                          from: 7,
                          to: 8,
                          color: "#DDDF0D" // yellow
                        },
                        {
                          from: 9,
                          to: 10,
                          color: "#DF5353" // red
                        }
                      ]}
                    /> */}
              </Col>
              <Col sm='4'>
                <Gauge
                  chartTitle='Watt'
                  min={0}
                  max={1000}
                  units='W'
                  plotBands={[
                    {
                      from: 0,
                      to: 200,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 200,
                      to: 400,
                      color: 'rgba(10, 10, 10, .25)',
                    },
                    {
                      from: 400,
                      to: 700,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 700,
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
                  value={powerGauge}
                />
                {/* <GaugeMeter
                      title="Watt"
                      name=""
                      chartTitle="Watt (W)"
                      min={0}
                      max={2000}
                      data={energyGauge}
                      plotBands={[
                        {
                          from: 0,
                          to: 600,
                          color: "#55BF3B" // green
                        },
                        {
                          from: 601,
                          to: 1500,
                          color: "#DDDF0D" // yellow
                        },
                        {
                          from: 1501,
                          to: 2000,
                          color: "#DF5353" // red
                        }
                      ]}
                    /> */}
              </Col>
            </Row>
            <Row>
              <Col sm='4' style={{ textAlign: 'center' }}>
                <Gauge
                  chartTitle='Energy'
                  min={0}
                  max={2000}
                  units='W/H'
                  plotBands={[
                    {
                      from: 0,
                      to: 600,
                      color: 'rgba(0, 255, 10, .50)',
                    },
                    {
                      from: 600,
                      to: 1200,
                      color: 'rgba(10, 10, 10, .25)',
                    },
                    {
                      from: 1200,
                      to: 1600,
                      color: 'rgba(255, 255, 10, .50)',
                    },
                    {
                      from: 1600,
                      to: 2000,
                      color: 'rgba(255, 50, 50, .50)',
                    },
                  ]}
                  majorTicks={[
                    0,
                    200,
                    400,
                    600,
                    800,
                    1000,
                    1200,
                    1400,
                    1600,
                    1800,
                    2000,
                  ]}
                  value={energyGauge}
                />
              </Col>
              <Col sm='4' style={{ textAlign: 'center' }}>
                <Gauge
                  chartTitle='Temperature'
                  min={0}
                  max={100}
                  //height={230}
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
              </Col>
              <Col sm='4' style={{ textAlign: 'center' }}>
                <Gauge
                  chartTitle='Humidity'
                  min={0}
                  max={100}
                  //height={230}
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
