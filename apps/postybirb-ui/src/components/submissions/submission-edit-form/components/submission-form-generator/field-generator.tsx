import { Trans } from '@lingui/macro';
import {
  BooleanFieldType,
  DescriptionFieldType,
  RadioFieldType,
  SelectFieldType,
  TagFieldType,
  TextFieldType,
} from '@postybirb/form-builder';
import { useEffect } from 'react';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';
import BooleanField from './fields/boolean-field';
import DescriptionField from './fields/description-field';
import InputField from './fields/input-field';
import RadioField from './fields/radio-field';
import SelectField from './fields/select-field';
import TagField from './fields/tag-field';

type FieldGeneratorProps = SubmissionGeneratedFieldProps;

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
    case 'checkbox':
    case 'switch':
      return (
        <BooleanField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<BooleanFieldType>)}
        />
      );
    case 'select':
      return (
        <SelectField
          key={key}
          {...(props as SubmissionGeneratedFieldProps<SelectFieldType>)}
        />
      );
    default:
      return <Trans>Unsupported field type.</Trans>;
  }
}
