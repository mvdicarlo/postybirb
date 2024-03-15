import { EuiCheckbox } from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DescriptionValue, NULL_ACCOUNT_ID } from '@postybirb/types';
import { useState } from 'react';
import { PostyBirbEditor } from '../../../../../shared/postybirb-editor/postybirb-editor';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';

type DescriptionFieldProps =
  SubmissionGeneratedFieldProps<DescriptionFieldType>;

export default function DescriptionField(props: DescriptionFieldProps) {
  const { propKey, field, defaultOption, option, onUpdate } = props;
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
      {option.account !== NULL_ACCOUNT_ID ? (
        <EuiCheckbox
          id={`cb-${option.id}-${propKey}-override`}
          checked={overrideDefault}
          label={<Trans>Override default</Trans>}
          onChange={(e) => {
            const descriptionValue = e.target.checked
              ? defaultOption.data.description?.description ?? ''
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
        <PostyBirbEditor
          inline={field.inline}
          value={description}
          onChange={(descriptionValue) => {
            setDescription(descriptionValue);
            option.data[propKey] = {
              ...value,
              description: descriptionValue,
            };
            onUpdate();
          }}
        />
      ) : null}
    </FormRow>
  );
}
