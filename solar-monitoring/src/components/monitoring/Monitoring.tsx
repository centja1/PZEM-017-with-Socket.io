import React, { ReactElement, useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  NavLink,
  TabContent,
  TabPane,
  Nav,
  NavItem,
  Button
} from "reactstrap";
import classnames from "classnames";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShower,
  faWater,
  faBroadcastTower,
  faCheckCircle,
  faSyncAlt,
  faFan
} from "@fortawesome/free-solid-svg-icons";

//init module
import DailyChart from "../charts/DailyChart";
import ConsoleLogs from "../console/ConsoleLogs";
//import GaugeMeter from "../meters/gaugeMeter";
import Gauge from "../meters/Gauge";
import moment from "moment";
import { subscribeData, unsubscribe, broadcastData } from "../socketio/client";
import "./monitering.css";
import Sunny from "../../assets/images/svg/sunny.svg";
import Cloudy from "../../assets/images/svg/cloudy.svg";

const reduceMessage = (limit: number, logs: any[], reverse = false) => {
  var totalRows = 0;
  logs.forEach((a: any, i: number) => {
    if (totalRows >= limit) logs.splice(i, 1);

    totalRows++;
  });
};

const reduceData = (limit: number, logs: any[]) => {
  var totalRows = 0;
  logs.forEach((a: any, i: number) => {
    if (totalRows >= limit) logs.shift();

    totalRows++;
  });
};

const dateFormat = "Y-M-D HH:mm ss";

export default (): ReactElement => {
  const [voltageGauge, setVoltageGauge] = useState<number>(0);
  const [currentGauge, setCurrentGauge] = useState<number>(0);
  const [powerGauge, setPowerGauge] = useState<number>(0);
  const [energyGauge, setEnergyGauge] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);

  const [batteryData, setBatteryData] = useState<any>([
    {
      id: "power (W)",
      color: "hsl(226, 70%, 50%)",
      data: []
    },
    {
      id: "current (A)",
      color: "hsl(298, 70%, 50%)",
      data: []
    },
    {
      id: "volts (V)",
      color: "hsl(157, 70%, 50%)",
      data: []
    }
  ]);



  const [deviceData, setDeviceData] = useState<any>([]);
  const [logs, setLogs] = useState<any>([]);
  const [activeTab, setActiveTab] = useState("1");
  const [deviceIpAddress, setDeviceIpAddress] = useState("");

  const [inverterSwitch, setInverterSwitch] = useState(false);
  const [coolingFans, setCoolingFans] = useState(false);
  const [waterfallPumpSwitch, setWaterfallPumpSwitch] = useState(false);
  const [waterSprinkler, setWaterSprinkler] = useState(false);

  const [disableBtnInverterSw, setDisableBtnInverterSw] = useState(false);
  const [disableBtnCoolingFansSw, setDisableBtnCoolingFansSw] = useState(false);
  const [disableBtnWaterfallPumpSw, setDisableBtnWaterfallPumpSw] = useState(
    false
  );
  const [disableBtnWaterSprinklerSw, setDisableBtnWaterSprinklerSw] = useState(
    false
  );

  const [inverterVoltageStart, setInverterVoltageStart] = useState(13.15);
  const [inverterVoltageShutdown, setInverterVoltageShutdown] = useState(11.20);

  const [percentageCharge, setPercentageCharge] = useState(0);

  let dataLogs: any[] = [];
  const toggle = (tab: any) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  useEffect(() => {
    const cb = (data: any) => {
      console.log("[data]:", data);
      if (data.sensor) {
        dataLogs.unshift({
          LogLevelType: "info",
          Timestamp: moment.utc().local(),
          Messages: JSON.stringify(data)
        });

        setVoltageGauge(data.sensor.voltage_usage);
        setCurrentGauge(data.sensor.current_usage);
        setPowerGauge(data.sensor.active_power);
        setEnergyGauge(data.sensor.active_energy);
        setTemperature(data.sensor.temperature);
        setHumidity(data.sensor.humidity);

        setDeviceData({
          voltage: data.sensor.voltage_usage,
          current: data.sensor.current_usage,
          power: data.sensor.active_power,
          energy: data.sensor.active_energy
        });

        reduceMessage(100, dataLogs);
        setLogs([...dataLogs]);
      } else if (data.deviceState) {
        const {
          IpAddress,
          SW1,
          SW2,
          SW3,
          SW4,
          inverterVoltageShutdown,
          inverterVoltageStart
        } = data.deviceState;
        setDeviceIpAddress(IpAddress);
        setInverterSwitch(SW1 === "ON");
        setCoolingFans(SW2 === "ON");
        setWaterfallPumpSwitch(SW3 === "ON");
        setWaterSprinkler(SW4 === "ON");
        setInverterVoltageStart(inverterVoltageStart);
        setInverterVoltageShutdown(inverterVoltageShutdown);

        setDisableBtnInverterSw(false);
        setDisableBtnCoolingFansSw(false);
        setDisableBtnWaterfallPumpSw(false);
        setDisableBtnWaterSprinklerSw(false);

        console.log(data.deviceState);
      } else console.log("socket.io response:", data);
    };
    subscribeData(cb);

    console.log("batteryData:", batteryData);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    broadcastData("checking", "");
  }, []);

  const rangePercentage = (
    input: number,
    range_min: number,
    range_max: number,
    range_2ndMax: number
  ) => {
    var percentage = ((input - range_min) * 100) / (range_max - range_min);
    if (percentage > 100) {
      if (typeof range_2ndMax !== "undefined") {
        percentage =
          ((range_2ndMax - input) * 100) / (range_2ndMax - range_max);
        if (percentage < 0) {
          percentage = 0;
        }
      } else {
        percentage = 100;
      }
    } else if (percentage < 0) {
      percentage = 0;
    }
    return percentage;
  };

  const maxArr = 6;
  const maxBatteryLevel = 13.0;
  const minBatteryLevel = 10.5;
  useEffect(() => {
    const currTime = moment.utc().format(dateFormat);
    //console.log(currTime);
    let chartData = [...batteryData];

    if (deviceData.power) {
      const powerIndex = 0;
      reduceData(maxArr, chartData[powerIndex].data);
      chartData[powerIndex].data = [
        ...chartData[powerIndex].data,
        {
          x: currTime,
          y: deviceData.power
        }
      ];
    }

    if (deviceData.current) {
      const currentIndex = 1;
      reduceData(maxArr, chartData[currentIndex].data);
      chartData[currentIndex].data = [
        ...chartData[currentIndex].data,
        {
          x: currTime,
          y: deviceData.current
        }
      ];
    }

    if (deviceData.voltage) {
      const voltageIndex = 2;
      setPercentageCharge(
        rangePercentage(
          deviceData.voltage,
          minBatteryLevel,
          maxBatteryLevel,
          100
        )
      );
      reduceData(maxArr, chartData[voltageIndex].data);
      chartData[voltageIndex].data = [
        ...chartData[voltageIndex].data,
        {
          x: currTime,
          y: deviceData.voltage
        }
      ];
    }

    setBatteryData(chartData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceData]);

  const handleSwitch = (sw: number) => {
    switch (sw) {
      case 1:
        broadcastData("SW1", !inverterSwitch ? "state:on" : "state:off");
        setDisableBtnInverterSw(true);
        break;
      case 2:
        broadcastData("SW2", !coolingFans ? "state:on" : "state:off");
        setDisableBtnCoolingFansSw(true);
        break;
      case 3:
        broadcastData("SW3", !waterfallPumpSwitch ? "state:on" : "state:off");
        setDisableBtnWaterfallPumpSw(true);
        break;
      case 4:
        broadcastData("SW4", !waterSprinkler ? "state:on" : "state:off");
        setDisableBtnWaterSprinklerSw(true);
        break;
      default:
        break;
    }
  };

  const handleSystemCheck = () => {
    broadcastData("checking", "");
  };

  const handleEnergyReset = () => {
    broadcastData("resetEnergy", "");
  };

  const Blik = (status: boolean) => {
    return status ? (
      <div className="led-box" style={{ marginRight: "10px" }}>
        <div className="led-green" style={{ marginLeft: "5px" }}></div>
      </div>
    ) : (
        <div className="led-box" style={{ marginRight: "10px" }}>
          <div className="led-red" style={{ marginLeft: "5px" }}></div>
        </div>
      );
  };

  const rangNumber = (start: number, end: number) => {
    var foo = [];
    for (let i = start; i <= end; i++) {
      foo.push(i);
    }
    return foo;
  };

  const isDay = () => {
    const hours = (new Date()).getHours();
    return (hours >= 6 && hours < 18);
  }

  const currentDate = () => {
    var d = new Date();
    var options = { weekday: 'long' };
    var dayName = d.toLocaleDateString('en-US', options).substr(0, 3).toUpperCase();
    return `${dayName} ${d.getDate()} / ${d.getFullYear().toString().substr(2, 2)}`;
  }

  return (
    <div>
      <Nav tabs>
        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === "1" })}
            onClick={() => {
              toggle("1");
            }}
          >
            IoT - Solar Project
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <Row>
            <Col sm="3" style={{ background: "linear-gradient(45deg, black, transparent)" }}>

              <br />

              <div>
                {/* {inverterSwitch ? "ON " : "OFF "}{" "} */}
                <Button
                  disabled={disableBtnInverterSw}
                  onClick={() => handleSwitch(1)}
                  color="primary"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Inverter <FontAwesomeIcon icon={faBroadcastTower} size="lg" />
                  {Blik(inverterSwitch)}
                </Button>
              </div>
              <div>
                {/* {coolingFans ? "ON " : "OFF "}{" "} */}
                <Button
                  disabled={disableBtnCoolingFansSw}
                  onClick={() => handleSwitch(2)}
                  color="warning"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Cooling Fans <FontAwesomeIcon icon={faFan} size="lg" />
                  {Blik(coolingFans)}       
                </Button>
              </div>
              <div>
                {/* {waterfallPumpSwitch ? "ON " : "OFF "}{" "} */}
                <Button
                  disabled={disableBtnWaterfallPumpSw}
                  onClick={() => handleSwitch(3)}
                  color="info"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Waterfall Pump <FontAwesomeIcon icon={faWater} size="lg" />
                  {Blik(waterfallPumpSwitch)}
                </Button>
              </div>
              <div>
                {/* {waterSprinkler ? "ON " : "OFF "} */}
                <Button
                  disabled={disableBtnWaterSprinklerSw}
                  onClick={() => handleSwitch(4)}
                  color="success"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Water Sprinkler <FontAwesomeIcon icon={faShower} size="lg" />
                  {Blik(waterSprinkler)}
                </Button>
              </div>
              <br />
              <div style={{ color: "white" }}>
                <strong style={{ textAlign: "center" }}>Battery State of Charge</strong>
              </div>
              <div className="single-chart" style={{ color: "white" }}>
                <svg viewBox="0 0 36 36" className="circular-chart green">
                  <path
                    className="circle-bg"
                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle"
                    stroke-dasharray={percentageCharge.toFixed(2) + ", 100"}
                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">
                    {percentageCharge.toFixed(1) + "%"}
                  </text>
                  <text x="10" y="25" style={{ fill: "white", fontSize: "0.16em" }}>
                    {voltageGauge.toFixed(2) + "V / " + currentGauge.toFixed(2) + "A"}
                  </text>
                </svg>
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                  <div style={{ width: "23%", float: "left", display: "inline" }}>
                    {
                      isDay() ?
                        <img alt="icon" src={Sunny} /> :
                        <img alt="icon" src={Cloudy} />
                    }
                  </div>
                  <div style={{ float: "left", display: "inline", textAlign: "left", fontWeight: "bold", fontSize: "smaller" }}>
                    <span>
                      {isDay() ? 'Sunny' : 'Cloudy'} {currentDate()}<br />
                        Temperature : {temperature.toFixed(1)} C°<br />
                        Humidity : {humidity.toFixed(1)} %
                      </span>
                  </div>
                </div>
                <br />
                <div style={{ textAlign: "center", fontSize: "x-small", marginTop: "20px" }}>
                  <strong>Device IP: {deviceIpAddress}</strong>
                  <br />
                  <strong>
                    Inverter Start : {inverterVoltageStart}V, Shutdown :{" "}
                    {inverterVoltageShutdown}V
                  </strong>
                </div>
              </div>
              <div>
                <Button
                  onClick={handleSystemCheck}
                  color="secondary"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Check <FontAwesomeIcon icon={faCheckCircle} size="lg" />
                </Button>
              </div>

              <div>
                <Button
                  onClick={handleEnergyReset}
                  color="danger"
                  style={{ margin: 5, width: 200, height: 50 }}
                >
                  Energy Reset <FontAwesomeIcon icon={faSyncAlt} size="lg" />
                </Button>
              </div>
            </Col>
            <Col sm="9">
              <Container>
                <Row>
                  <Col
                    style={{ width: "100%", height: 350, marginTop: 10 }}
                    sm="12"
                  >
                    <DailyChart
                      data={batteryData}
                      title="Real time Battery monitoring"
                      legend="Solar Power"
                      colors="category10"
                    />
                  </Col>
                </Row>
                <Row style={{ paddingTop: 20 }}>
                  <Col sm="4">
                    <Gauge
                      min={0}
                      max={18}
                      chartTitle="Voltage"
                      units="V"
                      plotBands={[
                        {
                          from: 0,
                          to: 9.0,
                          color: "rgba(255, 50, 50, .50)"
                        },
                        {
                          from: 9.1,
                          to: 12.5,
                          color: "rgba(255, 255, 10, .50)"
                        },
                        {
                          from: 11.1,
                          to: 14.5,
                          color: "rgba(0, 255, 10, .50)"
                        },
                        {
                          from: 14.5,
                          to: 18,
                          color: "rgba(10, 10, 10, .25)"
                        }
                      ]}
                      majorTicks={rangNumber(0, 18)}
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
                  <Col sm="4">
                    <Gauge
                      chartTitle="Current"
                      min={0}
                      max={10}
                      units="A"
                      plotBands={[
                        {
                          from: 0,
                          to: 2,
                          color: "rgba(0, 255, 10, .50)"
                        },
                        {
                          from: 2,
                          to: 5,
                          color: "rgba(10, 10, 10, .25)"
                        },
                        {
                          from: 5,
                          to: 8,
                          color: "rgba(255, 255, 10, .50)"
                        },
                        {
                          from: 8,
                          to: 10,
                          color: "rgba(255, 50, 50, .50)"
                        }
                      ]}
                      majorTicks={rangNumber(0, 10)}
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
                  <Col sm="4">
                    <Gauge
                      chartTitle="Watt"
                      min={0}
                      max={1000}
                      units="W"
                      plotBands={[
                        {
                          from: 0,
                          to: 200,
                          color: "rgba(0, 255, 10, .50)"
                        },
                        {
                          from: 200,
                          to: 400,
                          color: "rgba(10, 10, 10, .25)"
                        },
                        {
                          from: 400,
                          to: 700,
                          color: "rgba(255, 255, 10, .50)"
                        },
                        {
                          from: 700,
                          to: 1000,
                          color: "rgba(255, 50, 50, .50)"
                        }
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
                        1000
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
                  <Col sm="2"></Col>
                  <Col sm="2" style={{ textAlign: "center" }}>
                    <Gauge
                      chartTitle="Temperature"
                      min={0}
                      max={100}
                      height={230}
                      units="C&deg;"
                      plotBands={[
                        {
                          from: 0,
                          to: 15,
                          color: "rgba(0, 255, 10, .50)"
                        },
                        {
                          from: 15,
                          to: 35,
                          color: "rgba(10, 10, 10, .25)"
                        },
                        {
                          from: 35,
                          to: 60,
                          color: "rgba(255, 255, 10, .50)"
                        },
                        {
                          from: 60,
                          to: 100,
                          color: "rgba(255, 50, 50, .50)"
                        }
                      ]}
                      majorTicks={[
                        0,
                        10,
                        20,
                        30,
                        40,
                        50,
                        60,
                        70,
                        80,
                        90,
                        100
                      ]}
                      value={temperature}
                    />
                  </Col>
                  <Col sm="2"></Col>
                  <Col sm="2" style={{ textAlign: "center" }}>
                    <Gauge
                      chartTitle="Humidity"
                      min={0}
                      max={100}
                      height={230}
                      units="H (%)"
                      plotBands={[
                        {
                          from: 0,
                          to: 30,
                          color: "rgba(255, 50, 50, .50)"
                        }
                        ,
                        {
                          from: 30,
                          to: 50,
                          color: "rgba(255, 255, 10, .50)"
                        },
                        {
                          from: 50,
                          to: 70,
                          color: "rgba(10, 10, 10, .25)"
                        },

                        {
                          from: 70,
                          to: 100,
                          color: "rgba(0, 255, 10, .50)"
                        }
                      ]}
                      majorTicks={[
                        0,
                        10,
                        20,
                        30,
                        40,
                        50,
                        60,
                        70,
                        80,
                        90,
                        100
                      ]}
                      value={humidity}
                    />
                  </Col>
                </Row>
              </Container>
            </Col>
          </Row>
          <Row>
            <Col>
              <ConsoleLogs subscribData={logs} />
            </Col>
          </Row>
        </TabPane>
      </TabContent>
    </div>
  );
};
