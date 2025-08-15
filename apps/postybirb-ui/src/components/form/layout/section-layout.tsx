import { Box, Stack, Text } from '@mantine/core';
import { FieldAggregateType } from '@postybirb/form-builder';
import { WebsiteOptionsDto } from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { Field } from '../fields/field';
import './section-layout.css';

type FieldEntry = {
  key: string;
  field: FieldAggregateType;
};

type FormSection = {
  id: string;
  title: string;
  fields: FieldEntry[];
  order: number;
};

type SectionLayoutProps = {
  fields: Record<string, FieldAggregateType>;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
  submission: SubmissionDto;
};

const COMMON_FIELDS_TITLE = 'Common Fields';
const WEBSITE_FIELDS_TITLE = 'Website Specific Fields';
const FIELDS_SUFFIX = ' Fields';

const WELL_KNOWN_SECTIONS = {
  common: { title: COMMON_FIELDS_TITLE, order: 0 },
  website: { title: WEBSITE_FIELDS_TITLE, order: 1 }
};

function groupFieldsBySection(fields: Record<string, FieldAggregateType>): FormSection[] {
  const sectionMap = new Map<string, FieldEntry[]>();
  
  // Group fields by section
  Object.entries(fields).forEach(([key, field]) => {
    if (field.hidden) return;
    
    const sectionId = field.section || 'common';
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, []);
    }
    const sectionFields = sectionMap.get(sectionId);
    if (sectionFields) {
      sectionFields.push({ key, field });
    }
  });
  
  // Convert to sections with proper ordering
  const sections: FormSection[] = [];
  
  sectionMap.forEach((sectionFields, sectionId) => {
    const wellKnown = WELL_KNOWN_SECTIONS[sectionId as keyof typeof WELL_KNOWN_SECTIONS];
    const capitalizedTitle = sectionId.charAt(0).toUpperCase() + sectionId.slice(1) + FIELDS_SUFFIX;
    const section: FormSection = {
      id: sectionId,
      title: wellKnown?.title || capitalizedTitle,
      order: wellKnown?.order ?? 999,
      fields: sectionFields.sort((a, b) => (a.field.order || 999) - (b.field.order || 999))
    };
    sections.push(section);
  });
  
  return sections.sort((a, b) => a.order - b.order);
}

export function SectionLayout(props: SectionLayoutProps) {
  const { fields, option, defaultOption, submission } = props;
  const sections = groupFieldsBySection(fields);
  
  return (
    <Stack gap="xs" className="postybirb-section-layout">
      {sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          option={option}
          defaultOption={defaultOption}
          submission={submission}
        />
      ))}
    </Stack>
  );
}

function Section({
  section,
  option,
  defaultOption,
  submission
}: {
  section: FormSection;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
  submission: SubmissionDto;
}) {
  return (
    <Box className="postybirb-section">
      <Text 
        size="sm" 
        fw={600} 
        mb="md" 
        c="dimmed"
        className="postybirb-section-title"
      >
        {section.title}
      </Text>
      <FlexboxGrid
        fields={section.fields}
        option={option}
        defaultOption={defaultOption}
        submission={submission}
      />
    </Box>
  );
}

function FlexboxGrid({
  fields,
  option,
  defaultOption,
  submission
}: {
  fields: FieldEntry[];
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
  submission: SubmissionDto;
}) {
  return (
    <div className="postybirb-flexbox-grid">
      {fields.map((entry) => {
        const span = entry.field.span || 12;
        const offset = entry.field.offset || 0;
        const responsive = entry.field.responsive || {};
        
        return (
          <div
            key={entry.key}
            className={`
              postybirb-grid-item
              postybirb-span-${span}
              ${offset > 0 ? `postybirb-offset-${offset}` : ''}
              ${responsive.xs ? `postybirb-xs-${responsive.xs}` : ''}
              ${responsive.sm ? `postybirb-sm-${responsive.sm}` : ''}
              ${responsive.md ? `postybirb-md-${responsive.md}` : ''}
              ${responsive.lg ? `postybirb-lg-${responsive.lg}` : ''}
              ${entry.field.breakRow ? 'postybirb-break-row' : ''}
            `.trim()}
          >
            <Field
              submission={submission}
              propKey={entry.key}
              defaultOption={defaultOption}
              field={entry.field as unknown as FieldAggregateType}
              option={option}
              validation={submission.validations ?? []}
            />
          </div>
        );
      })}
    </div>
  );
}
