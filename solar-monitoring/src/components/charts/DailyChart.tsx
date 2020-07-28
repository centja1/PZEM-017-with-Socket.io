import React, { ReactElement, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ChartModel } from '../../typings/chartModel';

interface DailyChartProps {
  data: ChartModel[];
  title: string;
  legend: string;
  colors: any | undefined;
  isDecimalFormat: boolean;
  fixedNumber?: number;
}

const DailyChart = (props: DailyChartProps): ReactElement => {
  const Tooltip = ({ point }: any) => {
    //const index = point.id.split(".")[1]
    return (
      <div
        style={{
          border: 'solid 1px grey',
          padding: '9px 9px',
          background: 'white',
          position: 'absolute',
          left: 5,
          top: 20,
          width: 150,
        }}
      >
        <div
          style={{
            color: '#808080',
            padding: '3px 0',
          }}
        >
          <strong>Date: </strong> {point.data.xFormatted.split(' ')[0]}
        </div>
        <div
          style={{
            color: '#808080',
            padding: '3px 0',
          }}
        >
          <strong>Time: </strong> {point.data.xFormatted.split(' ')[1]}
        </div>
      </div>
    );
  };

  const [chartItemDisplay, setChartItemDisplay] = useState({
    volts: true,
    current: true,
    power: true,
    moisture: true,
    temperature: true,
    humidity: true,
  });

  const handleChangeChk = (e: React.ChangeEvent<HTMLInputElement>) => {
    let chartItems = { ...chartItemDisplay };
    let { id, checked } = e.target;
    if (id === 'volts') chartItems.volts = checked;
    else if (id === 'current') chartItems.current = checked;
    else if (id === 'power') chartItems.power = checked;
    else if (id === 'moisture') chartItems.moisture = checked;
    else if (id === 'temperature') chartItems.temperature = checked;
    else if (id === 'humidity') chartItems.humidity = checked;
    setChartItemDisplay(chartItems);
  };

  const chartData = () => {
    let response: any = [];
    props.data?.forEach((data) => {
      let title =
        data.id.split(' ').length > 1 ? data.id.split(' ')[0] : data.id;

      switch (title) {
        case 'volts':
          if (chartItemDisplay.volts) {
            response.push({
              ...data,
            });
          }
          break;
        case 'current':
          if (chartItemDisplay.current) {
            response.push({
              ...data,
            });
          }
          break;
        case 'power':
          if (chartItemDisplay.power) {
            response.push({
              ...data,
            });
          }
          break;
        case 'moisture':
          if (chartItemDisplay.moisture) {
            response.push({
              ...data,
            });
          }
          break;
        case 'temperature':
          if (chartItemDisplay.temperature) {
            response.push({
              ...data,
            });
          }
          break;
        case 'humidity':
          if (chartItemDisplay.humidity) {
            response.push({
              ...data,
            });
          }
          break;
      }
    });
    return response;
  };

  const capitalize = (s: string) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <>
      <div>
        <strong>{props.title}</strong>
      </div>
      <div
        style={{
          //float: 'right',
          //marginLeft: '45px',
          display: 'inline-flex',
        }}
      >
        {props.data.map((d, index) => {
          let title =
            d.id.split(' ').length > 1
              ? d.id.split(' ')[0].trim()
              : d.id.trim();

          return (
            <div key={index}>
              <input
                id={title}
                key={'cbx_' + index}
                type='checkbox'
                defaultChecked={true}
                onChange={handleChangeChk}
                style={{ marginRight: '5px' }}
              />
              <span key={'sp_' + index} style={{ marginRight: '5px' }}>
                {capitalize(title)}
              </span>
            </div>
          );
        })}
      </div>

      <ResponsiveLine
        data={chartData()}
        margin={{
          top: 10,
          right: 110,
          bottom: 70,
          left: 60,
        }}
        //xFormat='time:%Y-%m-%d %H:%M %S'
        xScale={{
          type: 'time',
          format: '%Y-%m-%d %H:%M %S',
          precision: 'second', // 'millisecond' | 'second' | 'minute' | 'hour' | 'month' | 'year' | 'day'
        }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        //curve='linear'
        curve='monotoneX'
        enableArea={true}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          orient: 'bottom',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: '%H:%M %S',
          tickValues: 'every 1 second', //hours , minutes
          legend: 'Time',
          legendOffset: 36,
          legendPosition: 'middle', // start, middle, end
        }}
        axisLeft={{
          //Vertical
          orient: 'left',
          tickSize: 5,
          tickPadding: 0,
          tickRotation: 0,
          format: (e: any) => {
            // if (Math.floor(e) != e) {
            //   return;
            // }

            return props.isDecimalFormat
              ? parseFloat(e).toFixed(props.fixedNumber)
              : parseFloat(e);
          },
          legend: props.legend,
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        colors={{ scheme: props.colors }}
        //colors={['#808080', 'red', '#91BC81']}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabel='y'
        pointLabelYOffset={-12}
        animate={false}
        motionStiffness={120}
        motionDamping={50}
        isInteractive={false}
        enableSlices={false}
        useMesh={true}
        tooltip={Tooltip}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 87,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
        layers={[
          'grid',
          'markers',
          'axes',
          //Area,
          //'crosshair',
          'lines',
          'points',
          'slices',
          'mesh',
          'legends',
        ]}
      />
    </>
  );
};

DailyChart.defaultProps = {
  toFixedNumber: 2,
};

export default DailyChart;
