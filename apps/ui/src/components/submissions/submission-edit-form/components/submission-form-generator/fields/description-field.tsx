import { EuiCheckbox, EuiTextArea } from '@elastic/eui';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DescriptionValue } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';

type DescriptionFieldProps =
  SubmissionGeneratedFieldProps<DescriptionFieldType>;

export default function DescriptionField(props: DescriptionFieldProps) {
  const { propKey, field, defaultOptions, option, onUpdate } = props;
  const validation = useValidations(props);
  const value: DescriptionValue = option.data[propKey] ?? field.defaultValue;
  const [overrideDefault, setOverrideDefault] = useState<boolean>(
    value.overrideDefault
  );
  const [description, setDescription] = useState<string>(
    value.description || ''
  );

  return (
    <FormRow {...props} validations={validation}>
      {option.account ? (
        <EuiCheckbox
          id={`cb-${option.id}-${propKey}-override`}
          checked={overrideDefault}
          label={
            <FormattedMessage
              id="override-default"
              defaultMessage="Override default"
            />
          }
          onChange={(e) => {
            const descriptionValue = e.target.checked
              ? defaultOptions.data.description?.description
              : '';
            setDescription(descriptionValue);
            setOverrideDefault(e.target.checked);
            option.data[propKey] = {
              description: descriptionValue,
              overrideDefault: e.target.checked,
            };
            onUpdate();
          }}
        />
      ) : null}
      {overrideDefault || option.isDefault ? (
        <EuiTextArea
          required={field.required}
          fullWidth
          compressed
          isInvalid={validation.isInvalid}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          onBlur={(e) => {
            setDescription(e.target.value);
            option.data[propKey] = {
              ...value,
              description: e.target.value,
            };
            onUpdate();
          }}
        />
      ) : null}
    </FormRow>
  );
}
