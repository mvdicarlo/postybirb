/* eslint-disable lingui/text-restrictions */
/**
 * DescriptionField - Rich text editor for descriptions.
 */

import { Trans } from '@lingui/react/macro';
import { Alert, Badge, Box, Checkbox, Group, Text } from '@mantine/core';
import { useDebouncedCallback, useDisclosure } from '@mantine/hooks';
import { DescriptionFieldType } from '@postybirb/form-builder';
import {
    DefaultDescription,
    DefaultDescriptionValue,
    DescriptionValue,
} from '@postybirb/types';
import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useUserConverters } from '../../../../../../../stores/entity/user-converter-store';
import { DescriptionEditor } from '../../../../../../shared';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { DescriptionPreviewPanel } from './description-preview-panel';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

/**
 * Recursively checks if a description contains a specific inline content type.
 */
function hasInlineContentType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
  type: string,
): boolean {
  for (const block of blocks) {
    if (Array.isArray(block?.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (block.content.some((inline: any) => inline?.type === type)) {
        return true;
      }
    }
    if (
      Array.isArray(block?.children) &&
      hasInlineContentType(block.children, type)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pattern to detect legacy shortcuts like {title}, {tags}, {cw}, {fa:username}, etc.
 */
const LEGACY_SHORTCUT_PATTERN = /\{[a-zA-Z0-9]+(?:\[[^\]]+\])?(?::[^}]+)?\}/;

/**
 * Recursively checks if a description contains legacy shortcut syntax in text nodes.
 */
/**
 * Extracts all unique usernames from 'username' inline nodes in description blocks.
 */
function extractUsernames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
): string[] {
  const usernames = new Set<string>();
  for (const block of blocks) {
    if (Array.isArray(block?.content)) {
      for (const inline of block.content) {
        if (inline?.type === 'username' && inline?.attrs?.username) {
          usernames.add(inline.attrs.username);
        }
      }
    }
    if (Array.isArray(block?.children)) {
      for (const name of extractUsernames(block.children)) {
        usernames.add(name);
      }
    }
  }
  return [...usernames];
}

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

/**
 * Recursively counts the number of text characters in the description blocks.
 * This is an approximation of the final posted length used only for display.
 */
function countTextLength(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
): number {
  let length = 0;
  for (const block of blocks) {
    if (typeof block?.text === 'string') {
      length += block.text.length;
    }
    if (Array.isArray(block?.content)) {
      length += countTextLength(block.content);
    }
    if (Array.isArray(block?.children)) {
      length += countTextLength(block.children);
    }
  }
  return length;
}

export function DescriptionField({
  fieldName,
  field,
}: FormFieldProps<DescriptionFieldType>) {
  const { getValue, setValue, option, submission } = useFormFieldsContext();
  const defaultOption = useDefaultOption<DescriptionValue>(fieldName);
  const validations = useValidations(fieldName);
  const [previewOpened, { toggle: togglePreview }] = useDisclosure(false);
  const userConverters = useUserConverters();

  const fieldValue =
    getValue<DescriptionValue>(fieldName) ??
    field.defaultValue ??
    DefaultDescriptionValue();
  const overrideDefault = fieldValue.overrideDefault || false;

  // Derive effective values. A per-website option may explicitly disable
  // (false) an inherited flag; only an unset (undefined) value falls back to
  // the default, so use ?? rather than ||.
  const defaultInsertTitle = defaultOption?.insertTitle || false;
  const defaultInsertTags = defaultOption?.insertTags || false;
  const insertTags = fieldValue.insertTags ?? defaultInsertTags;
  const insertTitle = fieldValue.insertTitle ?? defaultInsertTitle;
  const description = useMemo(
    () => fieldValue.description || DefaultDescription(),
    [fieldValue.description],
  );

  const hasTagsShortcut = useMemo(
    () => hasInlineContentType(description.content || [], 'tagsShortcut'),
    [description],
  );

  const hasTitleShortcut = useMemo(
    () => hasInlineContentType(description.content || [], 'titleShortcut'),
    [description],
  );

  const containsLegacyShortcuts = useMemo(
    () => hasLegacyShortcuts(description.content || []),
    [description],
  );

  const activeAliases = useMemo(() => {
    const usernames = extractUsernames(description.content || []);
    return userConverters.filter((c) => usernames.includes(c.username));
  }, [description, userConverters]);

  const { maxDescriptionLength } = field;
  const hasMaxLength =
    typeof maxDescriptionLength === 'number' &&
    Number.isFinite(maxDescriptionLength) &&
    maxDescriptionLength > 0;

  // When the custom editor is hidden the default description is what will be
  // posted, so count that instead so the counter stays meaningful.
  const showsCustomEditor = overrideDefault || option.isDefault;
  const descriptionLength = useMemo(() => {
    const content = showsCustomEditor
      ? description.content || []
      : defaultOption?.description?.content || [];
    return countTextLength(content);
  }, [showsCustomEditor, description, defaultOption]);

  const descriptionChangeEvent = useMemo(() => new EventTarget(), []);

  const debouncedDispatchDescriptionChange = useDebouncedCallback(
    () => descriptionChangeEvent.dispatchEvent(new Event('change')),
    { delay: 1000, flushOnUnmount: false },
  );

  return (
    <Box data-tour-id="edit-card-description">
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
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        {defaultOption === undefined ? null : (
          <Checkbox
            mb="4"
            disabled={submission.isArchived}
            checked={overrideDefault}
            onChange={(e) => {
              setValue(fieldName, {
                ...fieldValue,
                overrideDefault: e.target.checked,
              });
              debouncedDispatchDescriptionChange();
            }}
            label={<Trans>Use custom description</Trans>}
          />
        )}
        <Checkbox
          mb="4"
          disabled={
            submission.isArchived || (overrideDefault && hasTitleShortcut)
          }
          checked={insertTitle}
          onChange={(e) => {
            setValue(fieldName, {
              ...fieldValue,
              insertTitle: e.target.checked,
            });
            debouncedDispatchDescriptionChange();
          }}
          label={<Trans>Insert title at start</Trans>}
        />
        <Checkbox
          mb="4"
          disabled={
            submission.isArchived || (overrideDefault && hasTagsShortcut)
          }
          checked={insertTags}
          onChange={(e) => {
            setValue(fieldName, {
              ...fieldValue,
              insertTags: e.target.checked,
            });
            debouncedDispatchDescriptionChange();
          }}
          label={<Trans>Insert tags at end</Trans>}
        />
        {(overrideDefault || option.isDefault) && (
          <>
            <DescriptionEditor
              id={option.id}
              value={description}
              minHeight={35}
              showCustomShortcuts
              isDefaultEditor={option.isDefault}
              onPreview={togglePreview}
              readOnly={submission.isArchived}
              onChange={(value) => {
                setValue(fieldName, {
                  ...fieldValue,
                  description: value,
                });
                debouncedDispatchDescriptionChange();
              }}
            />
            {previewOpened && (
              <DescriptionPreviewPanel
                submissionId={submission.id}
                options={submission.options}
                isDefaultEditor={option.isDefault}
                currentOptionId={option.isDefault ? undefined : option.id}
                changeEvent={descriptionChangeEvent}
              />
            )}
            {activeAliases.length > 0 && (
              <Alert
                variant="light"
                color="blue"
                mt="xs"
                title={<Trans>Active Username Aliases</Trans>}
              >
                {activeAliases.map((alias) => (
                  <Box key={alias.id} mb={4}>
                    <Group gap="xs" wrap="wrap">
                      <Badge variant="outline" size="sm">
                        {alias.username}
                      </Badge>
                      <IconArrowRight size={12} />
                      {Object.entries(alias.convertTo).map(
                        ([site, converted]) => (
                          <Text key={site} size="xs" c="dimmed">
                            <Text span fw={500}>
                              {site}
                            </Text>
                            : {converted}
                          </Text>
                        ),
                      )}
                    </Group>
                  </Box>
                ))}
              </Alert>
            )}
          </>
        )}
        {hasMaxLength && (
          <Group justify="flex-end" mt={2}>
            <Text
              size="xs"
              c={descriptionLength > maxDescriptionLength ? 'red' : 'dimmed'}
            >
              {descriptionLength} / {maxDescriptionLength}
            </Text>
          </Group>
        )}
      </FieldLabel>
    </Box>
  );
}
