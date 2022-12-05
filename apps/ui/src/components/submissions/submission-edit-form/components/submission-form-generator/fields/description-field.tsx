import { DescriptionFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type DescriptionFieldProps =
  SubmissionGeneratedFieldProps<DescriptionFieldType>;

export default function DescriptionField(props: DescriptionFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  return <FormRow {...props}>Hello</FormRow>;
}
