import React from 'react';
import DayFlag from './DayFlag';
import './monitering.css';

interface DayFlagProps {
  temperature: number;
  humidity: number;
  deviceIpAddress: string;
  percentageVal: number;
  voltageGauge: number;
  currentGauge: number;
  inverterVoltageStart?: number;
  inverterVoltageShutdown?: number;
}
const CircularChart = (props: DayFlagProps) => {
  return (
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
          stroke-dasharray={props.percentageVal.toFixed(2) + ', 100'}
          d='M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831'
        />
        <text x='18' y='20.35' className='percentage'>
          {props.percentageVal.toFixed(1) + '%'}
        </text>
        <text x='10' y='25' style={{ fill: 'white', fontSize: '0.16em' }}>
          {props.voltageGauge.toFixed(2) +
            'V / ' +
            props.currentGauge.toFixed(2) +
            'A'}
        </text>
        <text x='14' y='29' style={{ fill: 'yellow', fontSize: '0.14em' }}>
          {props.temperature} C&deg;
        </text>
      </svg>
      <DayFlag temperature={props.temperature} humidity={props.humidity} />
      <br />
      <div
        style={{
          textAlign: 'center',
          fontSize: 'x-small',
          marginTop: '20px',
        }}
      >
        <strong>Device IP: {props.deviceIpAddress}</strong>
        <br />
        {
          <strong>
            Inverter Start : {props.inverterVoltageStart}V, Shutdown :{' '}
            {props.inverterVoltageShutdown}V
          </strong>
        }
      </div>
    </div>
  );
};

export default CircularChart;
