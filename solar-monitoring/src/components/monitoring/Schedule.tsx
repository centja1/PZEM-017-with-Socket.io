import React, { useState } from 'react';
import {
  ListGroup,
  ListGroupItem,
  Col,
  Badge,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Row,
} from 'reactstrap';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import classnames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

interface ScheduleProps {}

const Schedule = (props: ScheduleProps) => {
  let data = [
    {
      time: '8:25',
      state: 'ON',
      active: true,
    },
    {
      time: '10:00',
      state: 'ON',
      active: true,
    },
    {
      time: '12:30',
      state: 'ON',
      active: true,
    },
    {
      time: '13:00',
      state: 'ON',
      active: true,
    },
    {
      time: '15:00',
      state: 'OFF',
      active: true,
    },
    {
      time: '18:30',
      state: 'OFF',
      active: false,
    },
  ];

  const [activeTab, setActiveTab] = useState('1');

  const toggle = (tab: any) => {
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
              icon={faCalendarAlt}
              size='lg'
              style={{ marginRight: 5 }}
            />
            Schedule
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
              icon={faCog}
              size='lg'
              style={{ marginRight: 5 }}
            />
            Settings
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={activeTab}>
        <TabPane tabId='1'>
          <Row>
            <Col sm='12'>
              <ListGroup horizontal={false} style={{ marginTop: 5 }}>
                {data &&
                  data.map((v) => (
                    <ListGroupItem
                      color={
                        v.state === 'ON'
                          ? 'success'
                          : v.active === false
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      <Col sm='6' style={{ float: 'left', textAlign: 'left' }}>
                        <Badge style={{ marginRight: 10 }}>{v.state}</Badge>
                        <b>{v.time}</b>
                      </Col>
                      <Col
                        sm='6'
                        style={{ float: 'right', textAlign: 'right' }}
                      >
                        <BootstrapSwitchButton
                          onlabel='Active'
                          offlabel='Disable'
                          checked={v.active}
                          width={75}
                          size='xs'
                          onstyle='secondary'
                        />
                      </Col>
                    </ListGroupItem>
                  ))}
              </ListGroup>
            </Col>
          </Row>
        </TabPane>
        <TabPane tabId='2'>
          <Row>
            <Col sm='6'></Col>
            <Col sm='6'></Col>
          </Row>
        </TabPane>
      </TabContent>
    </div>
  );
};

export default Schedule;
