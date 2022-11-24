import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FieldAggregateType } from '@postybirb/form-builder';
import { ISubmissionOptions } from '@postybirb/types';
import { useState } from 'react';

type FieldGeneratorProps = {
  propKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: ISubmissionOptions<any>;
  field: FieldAggregateType<any>;
  onUpdate: () => void;
};

export default function FieldGenerator(props: FieldGeneratorProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );
  console.log(propKey, field, option.data[propKey]);
  // TODO figure out translation
  return (
    <EuiFormRow
      id={`option-${option.id}-${propKey}`}
      label={field.label}
      aria-label={field.label}
    >
      <EuiFieldText
        compressed
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          option.data[propKey] = e.target.value;
          setValue(e.target.value);
          onUpdate();
        }}
      />
    </EuiFormRow>
  );
}
