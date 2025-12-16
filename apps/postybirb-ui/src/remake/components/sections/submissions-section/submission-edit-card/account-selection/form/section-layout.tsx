/**
 * SectionLayout - Groups form fields by section and renders them in a 12-column grid.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group, Skeleton, Stack, Text } from '@mantine/core';
import { FieldAggregateType } from '@postybirb/form-builder';
import { useMemo } from 'react';
import { FormField } from './form-field';
import { useFormFieldsContext } from './form-fields-context';
import { SaveDefaultsPopover } from './save-defaults-popover';
import './section-layout.css';
import { ValidationAlerts } from './validation-alerts';

const COMMON_SECTION = 'common';

interface SectionGroup {
  name: string;
  fields: Array<{ fieldName: string; field: FieldAggregateType }>;
}

/**
 * Groups fields by their section property, orders by field.order
 */
function groupFieldsBySection(
  formFields: Record<string, FieldAggregateType>,
): SectionGroup[] {
  const sectionMap = new Map<
    string,
    Array<{ fieldName: string; field: FieldAggregateType }>
  >();

  // Group fields by section
  Object.entries(formFields).forEach(([fieldName, field]) => {
    const sectionName = field.section ?? COMMON_SECTION;

    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sectionMap.get(sectionName)!.push({ fieldName, field });
  });

  // Sort fields within each section by order
  sectionMap.forEach((fields) => {
    fields.sort((a, b) => (a.field.order ?? 0) - (b.field.order ?? 0));
  });

  // Convert to array, putting common first
  const sections: SectionGroup[] = [];

  if (sectionMap.has(COMMON_SECTION)) {
    sections.push({
      name: COMMON_SECTION,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fields: sectionMap.get(COMMON_SECTION)!,
    });
    sectionMap.delete(COMMON_SECTION);
  }

  // Add remaining sections alphabetically
  Array.from(sectionMap.keys())
    .sort()
    .forEach((sectionName) => {
      sections.push({
        name: sectionName,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        fields: sectionMap.get(sectionName)!,
      });
    });

  return sections;
}

interface GridItemProps {
  field: FieldAggregateType;
  fieldName: string;
}

function GridItem({ field, fieldName }: GridItemProps) {
  const span = field.span ?? 12;
  const offset = field.offset ?? 0;

  const classes = [`grid-item`, `span-${span}`];
  if (offset > 0) {
    classes.push(`offset-${offset}`);
  }

  return (
    <Box className={classes.join(' ')}>
      <FormField fieldName={fieldName} field={field} />
    </Box>
  );
}

interface SectionGroupComponentProps {
  section: SectionGroup;
}

function SectionGroupComponent({ section }: SectionGroupComponentProps) {
  return (
    <Box className="section-group">
      {section.name !== COMMON_SECTION && (
        <Text className="section-title">{section.name}</Text>
      )}
      <Box className="section-grid">
        {section.fields.map(({ fieldName, field }) => (
          <GridItem key={fieldName} fieldName={fieldName} field={field} />
        ))}
      </Box>
    </Box>
  );
}

export function SectionLayout() {
  const { formFields, isLoading, isError } = useFormFieldsContext();

  const sections = useMemo(() => {
    if (!formFields) return [];
    return groupFieldsBySection(formFields);
  }, [formFields]);

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={40} radius="sm" />
        <Skeleton height={40} radius="sm" />
        <Skeleton height={40} radius="sm" />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Text c="red">
        <Trans>Failed to load form fields</Trans>
      </Text>
    );
  }

  if (sections.length === 0) {
    return (
      <Text c="dimmed">
        <Trans>No form fields available</Trans>
      </Text>
    );
  }

  return (
    <Box className="section-layout">
      {/* Header with save defaults action */}
      <Group justify="flex-end" mb="xs">
        <SaveDefaultsPopover />
      </Group>

      {/* Non-field-specific validation alerts */}
      <ValidationAlerts />

      {sections.map((section) => (
        <SectionGroupComponent key={section.name} section={section} />
      ))}
    </Box>
  );
}
