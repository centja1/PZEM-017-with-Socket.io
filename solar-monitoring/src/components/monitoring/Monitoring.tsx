import React, { ReactElement, useState } from 'react';
import { NavLink, TabContent, TabPane, Nav, NavItem } from 'reactstrap';
import classnames from 'classnames';
import SolarPower from './SolarPower';
import SoiMoisture from './SoiMoisture';
import { Storage } from '../../utils/Storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import './monitering.css';

export default (): ReactElement => {
  const [activeTab, setActiveTab] = useState(Storage.getActiveTab());

  const toggle = (tab: any) => {
    Storage.setActiveTab(tab);
    if (activeTab !== tab) setActiveTab(tab);
  };

  return (
    <div>
      <Nav tabs>
        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === '1' })}
            onClick={() => {
              toggle('1');
            }}
          >
            <FontAwesomeIcon
              icon={faNetworkWired}
              size='lg'
              style={{ marginRight: 5 }}
            />
            IoT - Solar Project
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classnames({ active: activeTab === '2' })}
            onClick={() => {
              toggle('2');
            }}
          >
            <FontAwesomeIcon
              icon={faMicrochip}
              size='lg'
              style={{ marginRight: 5 }}
            />
            Soil Moisture
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={activeTab}>
        <TabPane key='1' tabId='1'>
          <SolarPower deviceName='ESP32' />
        </TabPane>
        <TabPane key='2' tabId='2'>
          <SoiMoisture deviceName='ESP8266' />
        </TabPane>
      </TabContent>
    </div>
  );
};
