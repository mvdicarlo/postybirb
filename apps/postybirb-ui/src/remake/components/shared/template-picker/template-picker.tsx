/**
 * TemplatePicker - Simple select component for choosing submission templates.
 * Uses the submissions store to get available templates.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Select, type SelectProps } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { useTemplateSubmissions } from '../../../stores';

interface TemplatePickerProps
  extends Omit<SelectProps, 'data' | 'value' | 'onChange'> {
  /** Selected template ID */
  value?: string;
  /** Callback when template selection changes */
  onChange: (templateId: string | null) => void;
  /** Filter templates by submission type */
  type?: SubmissionType;
}

/**
 * Select component for picking a submission template.
 * Filters by submission type if provided.
 */
export function TemplatePicker({
  value,
  onChange,
  type,
  label,
  ...selectProps
}: TemplatePickerProps) {
  const templates = useTemplateSubmissions();

  const options = useMemo(() => {
    let filtered = templates;

    // Filter by type if specified
    if (type) {
      filtered = templates.filter((tmpl) => tmpl.type === type);
    }

    // Sort alphabetically by name
    return filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((template) => ({
        value: template.id,
        label: template.name,
      }));
  }, [templates, type]);

  return (
    <Select
      label={label ?? <Trans>Template</Trans>}
      placeholder={t`Select a template`}
      data={options}
      value={value ?? null}
      onChange={onChange}
      clearable
      searchable
      nothingFoundMessage={<Trans>No templates found</Trans>}
      {...selectProps}
    />
  );
}
