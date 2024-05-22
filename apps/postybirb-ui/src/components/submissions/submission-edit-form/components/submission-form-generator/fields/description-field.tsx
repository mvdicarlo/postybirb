import { EuiCheckbox, EuiFlexGroup } from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { DescriptionFieldType } from '@postybirb/form-builder';
import {
  DefaultDescription,
  Description,
  DescriptionValue,
  NULL_ACCOUNT_ID,
} from '@postybirb/types';
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
  const [insertTitle, setInsertTitle] = useState<boolean | undefined>(
    value.insertTitle
  );
  const [insertTags, setInsertTags] = useState<boolean | undefined>(
    value.insertTags
  );
  const [description, setDescription] = useState<Description>(
    value.description || {}
  );

  const isDefaultAccount = option.account === NULL_ACCOUNT_ID;
  const checkboxOptions: JSX.Element[] = [];
  if (!isDefaultAccount) {
    checkboxOptions.push(
      <EuiCheckbox
        id={`cb-${option.id}-${propKey}-override`}
        checked={overrideDefault}
        label={<Trans>Override default</Trans>}
        onChange={(e) => {
          const descriptionValue = e.target.checked
            ? defaultOption.data.description?.description ??
              DefaultDescription()
            : DefaultDescription();
          setDescription(descriptionValue);
          setOverrideDefault(e.target.checked);
          option.data[propKey] = {
            description: descriptionValue,
            overrideDefault: e.target.checked,
          };
          onUpdate();
        }}
      />
    );
  }

  checkboxOptions.push(
    <EuiCheckbox
      id={`cb-${option.id}-${propKey}-insertTitle`}
      checked={insertTitle}
      label={<Trans>Insert title at start</Trans>}
      onChange={(e) => {
        setInsertTitle(e.target.checked);
        option.data[propKey] = {
          ...value,
          insertTitle: e.target.checked,
        };
        onUpdate();
      }}
    />
  );

  checkboxOptions.push(
    <EuiCheckbox
      id={`cb-${option.id}-${propKey}-insertTags`}
      checked={insertTags}
      label={<Trans>Insert tags at end</Trans>}
      onChange={(e) => {
        setInsertTags(e.target.checked);
        option.data[propKey] = {
          ...value,
          insertTags: e.target.checked,
        };
        onUpdate();
      }}
    />
  );

  return (
    <FormRow {...props} validations={validation}>
      {checkboxOptions.length ? (
        <EuiFlexGroup>{checkboxOptions}</EuiFlexGroup>
      ) : null}
      {overrideDefault || option.isDefault ? (
        <PostyBirbEditor
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
