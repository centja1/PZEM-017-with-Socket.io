import React from 'react';
import './monitering.css';
import Sunny from '../../assets/images/svg/sunny.svg';
import Cloudy from '../../assets/images/svg/cloudy.svg';
import useWindowSize from '../hooks/useWindowSize';

interface DayFlagProps {
  temperature: number;
  humidity: number;
}
const DayFlag = (props: DayFlagProps) => {
  const isDay = () => {
    const hours = new Date().getHours();
    return hours >= 6 && hours < 18;
  };

  const currentDate = () => {
    var d = new Date();
    var options = { weekday: 'long' };
    var dayName = d
      .toLocaleDateString('en-US', options)
      .substr(0, 3)
      .toUpperCase();
    return `${dayName} ${d.getDate()} ${d.toLocaleString('en-us', {
      month: 'short',
    })} ${d.getFullYear().toString()}`;
  };
  const size = useWindowSize();

  return (
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div
        style={{
          display: 'inline',
          float: 'left',
          marginLeft: 30,
          marginTop: -10,
        }}
      >
        <img
          alt='icon'
          src={isDay() ? Sunny : Cloudy}
          style={{ height: 76.7, width: 67.7 }}
        />
      </div>
      <div
        style={{
          float: 'left',
          display: 'inline',
          textAlign: size.width > 427 ? 'center' : 'left',
          fontWeight: 'bold',
          fontSize: size.width > 427 ? '8pt' : 'smaller',
          marginLeft: 3,
        }}
      >
        <span>
          {isDay() ? 'Sunny' : 'Cloudy'} {currentDate()}
          <br />
          Temperature : {props.temperature.toFixed(1)} C°
          <br />
          Humidity : {props.humidity.toFixed(1)} %
        </span>
      </div>
    </div>
  );
};

//H: 911x383
//V: 427x887

export default DayFlag;
