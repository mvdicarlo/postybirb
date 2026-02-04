/**
 * SelectField - Hybrid select/multi-select dropdown field.
 * Uses Mantine Select for flat options, TreeSelect for hierarchical groups.
 */

import { Select as MantineSelect, MultiSelect } from '@mantine/core';
import { SelectFieldType, SelectOption } from '@postybirb/form-builder';
import { getFileType } from '@postybirb/utils/file-type';
import { uniqBy } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useFormFieldsContext } from '../form-fields-context';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';
import {
  flattenSelectableOptions,
  handleMutuallyExclusiveSelection,
  hasNestedGroups,
} from './select-utils';
import { TreeSelect } from './tree-select';

function getSelectOptions(
  options: SelectFieldType['options'],
  submission: {
    isMultiSubmission: boolean;
    isTemplate: boolean;
    files: { fileName: string }[];
  },
): SelectOption[] {
  if (!options) return [];

  if (Array.isArray(options)) return options;

  // Discriminator based select options
  const { options: allOptions, discriminator } = options;
  if (submission.isMultiSubmission || submission.isTemplate) {
    const groupedOptions: SelectOption[] = [];
    Object.entries(allOptions).forEach(([, opts]) => {
      groupedOptions.push(...opts);
    });
    return groupedOptions;
  }

  if (discriminator === 'overallFileType') {
    const fileType = getFileType(submission.files[0]?.fileName || '');
    return allOptions[fileType] || [];
  }

  return [];
}

/**
 * Flattens options for Mantine's native Select/MultiSelect
 * (loses hierarchy but works for flat option lists)
 */
function flattenForMantine(
  options: SelectOption[],
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  for (const option of options) {
    if ('items' in option) {
      // Group - include group if selectable, then flatten children
      if (option.value !== undefined) {
        result.push({
          value: option.value,
          label: option.label,
        });
      }
      result.push(...flattenForMantine(option.items));
    } else {
      result.push({
        value:
          typeof option.value === 'string'
            ? option.value
            : JSON.stringify(option.value),
        label: option.label,
      });
    }
  }

  return result;
}

export function SelectField({
  fieldName,
  field,
}: FormFieldProps<SelectFieldType>) {
  const { getValue, setValue, submission } = useFormFieldsContext();
  const validations = useValidations(fieldName);

  const value =
    getValue<string | string[]>(fieldName) ?? field.defaultValue ?? '';
  const selectOptions = getSelectOptions(field.options, submission);

  // Detect if we need the tree select (hierarchical structure)
  const useTreeSelect = useMemo(
    () => hasNestedGroups(selectOptions),
    [selectOptions],
  );

  // Handle multi-select with mutually exclusive logic
  const handleMultiChange = useCallback(
    (newValues: string[]) => {
      const currentValues = Array.isArray(value) ? value : [];
      const addedValues = newValues.filter((v) => !currentValues.includes(v));

      if (addedValues.length > 0) {
        // Find the added option and apply mutually exclusive logic
        const flatOptions = flattenSelectableOptions(selectOptions);
        const addedOption = flatOptions.find((o) => o.value === addedValues[0]);
        const processedValues = handleMutuallyExclusiveSelection(
          currentValues,
          addedOption ?? null,
          selectOptions,
        );
        setValue(fieldName, processedValues);
      } else {
        // Removal - just set the new values
        setValue(fieldName, newValues);
      }
    },
    [value, selectOptions, fieldName, setValue],
  );

  // Use TreeSelect for hierarchical options
  if (useTreeSelect) {
    const treeValue = field.allowMultiple
      ? (Array.isArray(value) ? value : [])
      : (typeof value === 'string' ? value : '');

    return (
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        <TreeSelect
          options={selectOptions}
          value={treeValue}
          onChange={(newValue) => setValue(fieldName, newValue)}
          multiple={field.allowMultiple}
          error={validations.isInvalid}
        />
      </FieldLabel>
    );
  }

  // Use Mantine native select for flat options
  const flatOptions = uniqBy(flattenForMantine(selectOptions), 'value');

  if (field.allowMultiple) {
    const multiValue = Array.isArray(value) ? value : [];

    return (
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        <MultiSelect
          data={flatOptions}
          value={multiValue}
          onChange={handleMultiChange}
          clearable
          searchable
        />
      </FieldLabel>
    );
  }

  const singleValue = typeof value === 'string' ? value : '';

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      <MantineSelect
        data={flatOptions}
        value={singleValue}
        onChange={(val) => setValue(fieldName, val)}
        clearable
        searchable
      />
    </FieldLabel>
  );
}
