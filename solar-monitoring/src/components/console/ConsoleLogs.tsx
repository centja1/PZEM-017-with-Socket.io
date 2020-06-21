import React from 'react';
import {
  Row,
  Col,
  NavLink,
  TabContent,
  TabPane,
  Nav,
  NavItem,
} from 'reactstrap';
import classnames from 'classnames';
//import spinnerIcon from '../../assets/images/icon/spinner-preloader.gif';
import './console.css';
import { LogData } from '../../typings/logData';

interface ConsoleLogProps {
  logs: LogData[];
}

const ConsoleLogs = (props: ConsoleLogProps) => {
  return (
    <div className='card-container-reflux'>
      {
        <>
          <Nav tabs>
            <NavItem>
              <NavLink className={classnames({ active: true })}>
                Console Logs
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab='1'>
            <TabPane tabId='1'>
              <Row>
                <Col sm='12'>
                  {/* <Avatar size="small" src={spinnerIcon} /> */}
                  <div id='logs' className='terminal'>
                    <ul>
                      {props.logs.map((data: LogData, index: number) => {
                        const { logLevelType, messages, timestamp } = data;
                        let classType =
                          'orange logtype-' + logLevelType
                            ? logLevelType.toLowerCase()
                            : '';
                        return (
                          <li key={index}>
                            <span className='white'>
                              {new Date(timestamp).toLocaleString()}
                            </span>
                            <span className={classType}>
                              {' '}
                              [
                              {logLevelType === 'Information'
                                ? 'Info'
                                : logLevelType}
                              ]{' '}
                            </span>
                            <span> {messages}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </Col>
              </Row>
            </TabPane>
          </TabContent>
        </>
      }
    </div>
  );
};

export default ConsoleLogs;
