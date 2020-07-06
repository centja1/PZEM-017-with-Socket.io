import React from 'react';
import { ListGroup, ListGroupItem, Col, Badge } from 'reactstrap';

interface ScheduleProps {}

const Schedule = (props: ScheduleProps) => {
  return (
    <ListGroup horizontal={false}>
      <ListGroupItem color='success'>
        <Col sm='6' style={{ float: 'left', textAlign: 'left' }}>
          8:00
          <Badge style={{ marginLeft: 10 }}>ON</Badge>
        </Col>
        <Col sm='6' style={{ float: 'right', textAlign: 'right' }}>
          Active
        </Col>
      </ListGroupItem>
      <ListGroupItem color='warning'>10:00</ListGroupItem>
      <ListGroupItem color='success'>12:00</ListGroupItem>
      <ListGroupItem color='danger'>13:00</ListGroupItem>
    </ListGroup>
  );
};

export default Schedule;
