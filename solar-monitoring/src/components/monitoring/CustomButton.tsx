import React from 'react';
import { Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './monitering.css';
import Blik from '../common/Blik';

interface CustomButtonProps {
  title: string;
  disabled?: boolean;
  onClick: any;
  icon: any;
  flagStatus: boolean;
  color: string;
  width: number;
  isBlik: boolean;
}

const CustomButton = (props: CustomButtonProps) => {
  return (
    <Button
      disabled={props.disabled}
      onClick={props.onClick}
      color={props.color}
      style={{
        marginBottom: 5,
        marginTop: 5,
        marginLeft: 2,
        width: props.width,
        height: 50,
      }}
    >
      {props.isBlik && (
        <div style={{ float: 'left' }}>{Blik(props.flagStatus)}</div>
      )}

      {props.title}
      <div style={{ float: 'right', marginRight: 2 }}>
        <FontAwesomeIcon icon={props.icon} size='lg' />
      </div>
    </Button>
  );
};

CustomButton.defaultProps = {
  width: 210,
  isBlik: true,
  flagStatus: false,
};

export default CustomButton;
