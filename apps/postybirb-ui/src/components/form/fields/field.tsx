import { Box } from '@mantine/core';
import type {
  BooleanFieldType,
  DateTimeFieldType,
  DescriptionFieldType,
  RadioFieldType,
  SelectFieldType,
  TagFieldType,
  TextFieldType,
} from '@postybirb/form-builder';
import { useValidations } from '../hooks/use-validations';
import { BooleanField } from './boolean-field';
import { DateTimeField } from './datetime-field';
import { DescriptionField } from './description-field';
import './field.css';
import { FormFieldProps } from './form-field.type';
import { InputField } from './input-field';
import { RadioField } from './radio-field';
import { SelectField } from './select-field';
import { TagField } from './tag-field';

export function Field(props: FormFieldProps): JSX.Element | null {
  const { field, option, defaultOption } = props;
  const validations = useValidations(props);

  if (field.showWhen) {
    const evaluations: boolean[] = [];

    for (const showWhen of field.showWhen) {
      const [k, expects] = showWhen;
      let currentValue = option.data[k];
      if (option !== defaultOption) {
        if (k === 'rating' && !currentValue) {
          currentValue = defaultOption.data[k];
        }
      }
      evaluations.push(expects.includes(currentValue));
    }

    const shouldHide = !evaluations.every((v) => v === true);
    if (shouldHide) {
      return null;
    }
  }

  let formField: JSX.Element | null = null;
  switch (field.formField) {
    case 'description':
      formField = (
        <DescriptionField
          {...(props as FormFieldProps<DescriptionFieldType>)}
        />
      );
      break;
    case 'input':
    case 'textarea':
      formField = <InputField {...(props as FormFieldProps<TextFieldType>)} />;
      break;
    case 'radio':
    case 'rating':
      formField = <RadioField {...(props as FormFieldProps<RadioFieldType>)} />;
      break;
    case 'checkbox':
      formField = (
        <BooleanField {...(props as FormFieldProps<BooleanFieldType>)} />
      );
      break;
    case 'tag':
      formField = <TagField {...(props as FormFieldProps<TagFieldType>)} />;
      break;
    case 'select':
      formField = (
        <SelectField {...(props as FormFieldProps<SelectFieldType>)} />
      );
      break;
    case 'datetime':
      formField = (
        <DateTimeField {...(props as FormFieldProps<DateTimeFieldType>)} />
      );
      break;
    default:
      // @ts-expect-error Unknown type for ts
      // eslint-disable-next-line lingui/no-unlocalized-strings
      formField = <div>Unknown field type: {field.formField}</div>;
  }

  const hasErrors = validations.errors?.length;
  const hasWarnings = validations.warnings?.length;

  if (hasErrors || hasWarnings) {
    return (
      <Box
        pr={6}
        pb={3}
        pl={6}
        className={
          hasErrors ? 'postybirb-field-error' : 'postybirb-field-warning'
        }
      >
        {formField}
      </Box>
    );
  }

  return <Box>{formField}</Box>;
}
