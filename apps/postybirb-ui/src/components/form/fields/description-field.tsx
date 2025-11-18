import { Trans } from "@lingui/react/macro";
import { Box, Checkbox } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DefaultDescriptionValue, DescriptionValue } from '@postybirb/types';
import { PostyBirbEditor } from '../../shared/postybirb-editor/postybirb-editor';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function DescriptionField(props: FormFieldProps<DescriptionFieldType>) {
  const { field, propKey, option } = props;
  const { values, setFieldValue } = useFormFields();
  const defaultOption = useDefaultOption<DescriptionValue>(props);
  const validations = useValidations(props);

  // Get field values from the context
  const fieldValue: DescriptionValue =
    (values[propKey] as DescriptionValue) ||
    field.defaultValue ||
    DefaultDescriptionValue();
  const overrideDefault = fieldValue.overrideDefault || false;
  const insertTags = fieldValue.insertTags || false;
  const insertTitle = fieldValue.insertTitle || false;
  const description = fieldValue.description || [];

  return (
    <Box>
      <FieldLabel {...props} validationState={validations}>
        {defaultOption === undefined ? null : (
          <Checkbox
            mb="4"
            checked={overrideDefault}
            onChange={(e) => {
              setFieldValue(propKey, {
                ...fieldValue,
                overrideDefault: e.target.checked,
              });
            }}
            label={<Trans>Use custom description</Trans>}
          />
        )}
        <Checkbox
          mb="4"
          checked={insertTitle}
          onChange={(e) => {
            setFieldValue(propKey, {
              ...fieldValue,
              insertTitle: e.target.checked,
            });
          }}
          label={<Trans>Insert title at start</Trans>}
        />
        <Checkbox
          mb="4"
          checked={insertTags}
          onChange={(e) => {
            setFieldValue(propKey, {
              ...fieldValue,
              insertTags: e.target.checked,
            });
          }}
          label={<Trans>Insert tags at end</Trans>}
        />
        {overrideDefault || option.isDefault ? (
          <div style={{ position: 'relative' }}>
            <PostyBirbEditor
              isDefaultEditor={option.isDefault}
              value={description}
              onChange={(descriptionValue) => {
                setFieldValue(propKey, {
                  ...fieldValue,
                  description: descriptionValue,
                });
              }}
            />
          </div>
        ) : null}
      </FieldLabel>
    </Box>
  );
}
