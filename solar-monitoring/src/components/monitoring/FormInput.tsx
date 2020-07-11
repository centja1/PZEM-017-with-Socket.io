import React from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
interface FormInputProps {
  formRef: any;
}

const FormInput = (props: FormInputProps) => {
  return (
    <Form inline>
      <FormGroup>
        <FontAwesomeIcon icon={faClock} size='lg' style={{ marginRight: 5 }} />
        <Label for='txtDelayTime'>Delay Time </Label>

        <Input
          type='select'
          name='select'
          id='txtDelayTime'
          innerRef={props.formRef}
          style={{ marginLeft: 5 }}
        >
          <option value={10}>10 sec</option>
          <option selected value={20}>
            20 sec
          </option>
          <option value={30}>30 sec</option>
          <option value={60}>1 min</option>
          <option value={120}>2 min</option>
          <option value={300}>5 min</option>
        </Input>
      </FormGroup>
    </Form>
  );
};

export default FormInput;
