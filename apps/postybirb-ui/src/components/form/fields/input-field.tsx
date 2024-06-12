import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  CopyButton,
  TextInput,
  Textarea,
  Tooltip,
  rem,
} from '@mantine/core';
import { TextFieldType } from '@postybirb/form-builder';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

function FieldCopyButton({ value }: { value: string | undefined }) {
  return (
    <CopyButton value={value?.trim() || ''} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip
          label={copied ? <Trans>Copied</Trans> : <Trans>Copy</Trans>}
          withArrow
          position="right"
        >
          <ActionIcon
            color={copied ? 'teal' : 'gray'}
            variant="subtle"
            onClick={copy}
          >
            {copied ? (
              <IconCheck style={{ width: rem(16) }} />
            ) : (
              <IconCopy style={{ width: rem(16) }} />
            )}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

type CommonFieldProps = {
  defaultValue: string | undefined;
};

function TextField(props: FormFieldProps<TextFieldType> & CommonFieldProps) {
  const { propKey, form, field, defaultValue } = props;
  const inputProps = form.getInputProps(propKey);
  const value = inputProps.value || '';
  return (
    <TextInput
      {...inputProps}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      description={
        field.maxLength
          ? `${value?.length ?? 0} / ${field.maxLength}`
          : undefined
      }
      rightSection={<FieldCopyButton value={value} />}
    />
  );
}

function TextAreaField(
  props: FormFieldProps<TextFieldType> & CommonFieldProps
) {
  const { propKey, form, field, defaultValue } = props;
  const inputProps = form.getInputProps(propKey);
  const value = inputProps.value || '';

  return (
    <Textarea
      {...inputProps}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      description={
        field.maxLength
          ? `${value?.length ?? 0} / ${field.maxLength}`
          : undefined
      }
      rightSection={<FieldCopyButton value={value} />}
    />
  );
}

export function InputField(props: FormFieldProps<TextFieldType>) {
  const { field } = props;
  const defaultValue = useDefaultOption<string>(props);
  const { errors, warnings, isInvalid } = useValidations(props);
  return (
    <FieldLabel {...props} validationState={{ errors, warnings, isInvalid }}>
      {field.formField === 'input' ? (
        <TextField {...props} defaultValue={defaultValue} />
      ) : (
        <TextAreaField {...props} defaultValue={defaultValue} />
      )}
    </FieldLabel>
  );
}
