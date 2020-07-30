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
import {
  faCog,
  faCalendarAlt,
  faEdit,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

interface ScheduleProps {}

const Schedule = (props: ScheduleProps) => {
  let data = [
    {
      time: '8:25',
      state: 'ON',
      delay: 20,
      repeat: 'Sat,Sun',
      active: true,
    },
    {
      time: '10:00',
      state: 'ON',
      delay: 20,
      repeat: 'EveryDay',
      active: true,
    },
    {
      time: '12:30',
      state: 'ON',
      delay: 30,
      repeat: 'EveryDay',
      active: true,
    },
    {
      time: '13:00',
      state: 'ON',
      delay: 20,
      repeat: 'Mon,Tue,Wed',
      active: true,
    },
    {
      time: '15:00',
      state: 'OFF',
      delay: 0,
      repeat: 'Mon,Tue,Wed,Thu,Fri',
      active: true,
    },
    {
      time: '18:30',
      state: 'OFF',
      delay: 0,
      repeat: 'EveryDay',
      active: false,
    },
    {
      time: '20:00',
      state: 'OFF',
      delay: 0,
      repeat: 'Mon,Tue,Wed,Thu,Fri',
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
                  data.map((v, index) => (
                    <ListGroupItem
                      key={index}
                      color={
                        v.state === 'ON'
                          ? 'success'
                          : v.active === false
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      <div style={{ float: 'left', textAlign: 'left' }}>
                        <Badge style={{ marginRight: 2 }}>{v.state}</Badge>
                        <b>{v.time}</b>
                      </div>

                      <div style={{ float: 'right', textAlign: 'right' }}>
                        {(v.delay || v.delay !== 0) && (
                          <Badge
                            color='danger'
                            style={{
                              fontWeight: 'bold',
                              fontSize: 'xx-small',
                            }}
                          >
                            {v.delay} Sec
                          </Badge>
                        )}{' '}
                        {v.repeat && (
                          <Badge
                            color='success'
                            style={{
                              fontWeight: 'bold',
                              fontSize: 'xx-small',
                            }}
                          >
                            {v.repeat}
                          </Badge>
                        )}{' '}
                        <BootstrapSwitchButton
                          onlabel='Active'
                          offlabel='Disable'
                          checked={v.active}
                          width={75}
                          size='xs'
                          onstyle='secondary'
                        />
                        <FontAwesomeIcon
                          icon={faEdit}
                          size='lg'
                          style={{ paddingLeft: 5 }}
                        />
                        <FontAwesomeIcon
                          icon={faTrashAlt}
                          size='lg'
                          style={{ paddingLeft: 4 }}
                        />
                      </div>
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
