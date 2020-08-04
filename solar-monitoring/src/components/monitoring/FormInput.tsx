import React from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
interface FormInputProps {
  formRef: any;
  defaultValue: number;
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
          defaultValue={props.defaultValue}
        >
          <option value={10}>10 sec</option>
          <option value={20}>20 sec</option>
          <option value={30}>30 sec</option>
          <option value={40}>40 sec</option>
          <option value={50}>50 sec</option>
          <option value={60}>1 min</option>
          <option value={120}>2 min</option>
          <option value={180}>3 min</option>
          <option value={300}>5 min</option>
        </Input>
      </FormGroup>
    </Form>
  );
};

FormInput.defaultProps = {
  defaultValue: 20,
};

export default FormInput;
