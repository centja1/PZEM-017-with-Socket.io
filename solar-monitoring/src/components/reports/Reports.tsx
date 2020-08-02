import React, { useState, useEffect } from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';
import DailyChart from '../charts/DailyChart';
import { ChartModel, ChartSeries } from '../../typings/chartModel';
import { powerData } from '../../typings/powerData';
import { db } from '../../config';
import { AppConfig } from '../../constants/Constants';
import { ReduceData } from '../../utils/ReduceMessage';
import { isMobile } from 'react-device-detect';

const Reports = () => {
  const [deviceData, setDeviceData] = useState<powerData>();
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

  const firebaseInitial = () => {
    var app = db.ref('data').limitToLast(1);
    app.on('child_added', function (snapshot) {
      const deviceData = snapshot.val();
      if (deviceData.sensor.voltage_usage)
        setDeviceData({
          voltage: deviceData.sensor.voltage_usage,
          current: deviceData.sensor.current_usage,
          power: deviceData.sensor.active_power,
          energy: deviceData.sensor.active_energy,
          time: deviceData.time,
        });
    });
  };

  useEffect(() => {
    firebaseInitial();
    return () => firebaseInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxArr = isMobile ? 4 : 7;
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

  return (
    <div>
      <Row>
        <Col style={{ width: '100%', height: 310, marginTop: 7 }} sm='12'>
          <DailyChart
            key='report'
            data={batteryData}
            title='Real time Battery Monitoring'
            legend='Solar Power'
            colors='category10'
            isDecimalFormat={true}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
