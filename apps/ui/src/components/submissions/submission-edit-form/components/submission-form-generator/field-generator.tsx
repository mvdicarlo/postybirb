import { RadioFieldType, TextFieldType } from '@postybirb/form-builder';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';
import InputField from './fields/input-field';
import RadioField from './fields/radio-field';

type FieldGeneratorProps = SubmissionGeneratedFieldProps;

// TODO figure out translation
export default function FieldGenerator(props: FieldGeneratorProps) {
  const { field } = props;
  switch (field.formField) {
    case 'input':
    case 'textarea':
      return (
        <InputField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(props as SubmissionGeneratedFieldProps<TextFieldType<any>>)}
        />
      );
    case 'radio':
      return (
        <RadioField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(props as SubmissionGeneratedFieldProps<RadioFieldType<any>>)}
        />
      );
    default:
      return <div>Unsupported field type.</div>;
  }
}
