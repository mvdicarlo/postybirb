/* eslint-disable lingui/text-restrictions */
import { Trans } from '@lingui/react/macro';
import { Alert, Box, Checkbox } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DefaultDescription, DefaultDescriptionValue, DescriptionValue } from '@postybirb/types';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { PostyBirbEditor } from '../../shared/postybirb-editor/postybirb-editor';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

/**
 * Pattern to detect legacy shortcuts like {title}, {tags}, {cw}, {fa:username}, etc.
 */
const LEGACY_SHORTCUT_PATTERN = /\{[a-zA-Z0-9]+(?:\[[^\]]+\])?(?::[^}]+)?\}/;

/**
 * Recursively checks if a description contains legacy shortcut syntax in text nodes.
 */
function hasLegacyShortcuts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
): boolean {
  for (const block of blocks) {
    if (Array.isArray(block?.content)) {
      for (const inline of block.content) {
        if (
          inline?.type === 'text' &&
          typeof inline?.text === 'string' &&
          LEGACY_SHORTCUT_PATTERN.test(inline.text)
        ) {
          return true;
        }
      }
    }
    if (Array.isArray(block?.children) && hasLegacyShortcuts(block.children)) {
      return true;
    }
  }
  return false;
}

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

  // Derive effective values - if default has it enabled, it's always enabled (locked)
  const defaultInsertTitle = defaultOption?.insertTitle || false;
  const defaultInsertTags = defaultOption?.insertTags || false;
  const insertTags = fieldValue.insertTags || defaultInsertTags;
  const insertTitle = fieldValue.insertTitle || defaultInsertTitle;
  const description = useMemo(
    () => fieldValue.description || DefaultDescription(),
    [fieldValue.description],
  );

  const containsLegacyShortcuts = useMemo(
    () => hasLegacyShortcuts(description.content || []),
    [description],
  );

  return (
    <Box>
      {containsLegacyShortcuts && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={<Trans>Legacy Shortcuts Detected</Trans>}
          color="yellow"
          mb="sm"
        >
          <Trans>
            Your description contains legacy shortcut syntax. These are no
            longer supported. Please use the new shortcut menu (type @, &lbrace;
            or &#96;) to insert shortcuts.
          </Trans>
        </Alert>
      )}
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
          disabled={defaultInsertTitle}
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
          disabled={defaultInsertTags}
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
