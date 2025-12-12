/**
 * TagField - Tag input with groups and conversion support.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Checkbox, TagsInput } from '@mantine/core';
import { TagFieldType } from '@postybirb/form-builder';
import { DefaultTagValue, Tag, TagValue } from '@postybirb/types';
import { uniq } from 'lodash';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function TagField({
  fieldName,
  field,
}: FormFieldProps<TagFieldType>): JSX.Element {
  const { getValue, setValue, option } = useFormFieldsContext();
  const defaultOption = useDefaultOption<TagValue>(fieldName);
  const validations = useValidations(fieldName);

  const fieldValue =
    getValue<TagValue>(fieldName) ?? field.defaultValue ?? DefaultTagValue();
  const overrideDefault = fieldValue.overrideDefault || false;
  const tagValue = fieldValue.tags || [];
  const allTags = [...tagValue, ...(defaultOption?.tags || [])];

  const updateTags = (tags: Tag[]) => {
    if (defaultOption && !overrideDefault) {
      const defaultTags = defaultOption.tags || [];
      setValue(fieldName, {
        ...fieldValue,
        tags: uniq(tags.filter((tag) => !defaultTags.includes(tag))),
      });
    } else {
      setValue(fieldName, { ...fieldValue, tags: uniq(tags) });
    }
  };

  const totalTags = overrideDefault ? tagValue.length : allTags.length;

  return (
    <Box>
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        {option.isDefault ? null : (
          <Checkbox
            mb="4"
            checked={overrideDefault}
            onChange={(e) => {
              setValue(fieldName, {
                ...fieldValue,
                overrideDefault: e.target.checked,
              });
            }}
            label={
              <Trans context="override-default">Ignore default tags</Trans>
            }
          />
        )}
        <TagsInput
          inputWrapperOrder={['label', 'input', 'description', 'error']}
          clearable
          required={field.required}
          value={tagValue}
          data={[]}
          onClear={() => {
            setValue(fieldName, { ...fieldValue, tags: [] });
          }}
          description={
            field.maxTags ? `${totalTags ?? 0} / ${field.maxTags}` : undefined
          }
          onChange={(tags) => {
            updateTags([...tags]);
          }}
        />
      </FieldLabel>
    </Box>
  );
}
