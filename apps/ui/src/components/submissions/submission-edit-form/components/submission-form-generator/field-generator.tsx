import {
  DescriptionFieldType,
  RadioFieldType,
  TagFieldType,
  TextFieldType,
} from '@postybirb/form-builder';
import { useEffect } from 'react';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';
import DescriptionField from './fields/description-field';
import InputField from './fields/input-field';
import RadioField from './fields/radio-field';
import TagField from './fields/tag-field';

type FieldGeneratorProps = SubmissionGeneratedFieldProps;

// TODO figure out translation
export default function FieldGenerator(props: FieldGeneratorProps) {
  const { propKey, option, field } = props;
  const key = `${option.id}-gen-${propKey}`;

  useEffect(() => {
    if (option.data[propKey] === undefined) {
      option.data[propKey] = field.defaultValue || undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  switch (field.formField) {
    case 'input':
    case 'textarea':
      return (
        <InputField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<TextFieldType>)}
        />
      );
    case 'radio':
    case 'rating':
      return (
        <RadioField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<RadioFieldType>)}
        />
      );
    case 'tag':
      return (
        <TagField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<TagFieldType>)}
        />
      );
    case 'description':
      return (
        <DescriptionField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<DescriptionFieldType>)}
        />
      );
    default:
      return <div>Unsupported field type.</div>;
  }
}
