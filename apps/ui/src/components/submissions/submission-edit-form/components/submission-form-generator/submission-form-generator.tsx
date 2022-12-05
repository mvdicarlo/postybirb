import { EuiFlexGroup, EuiFlexItem, EuiForm } from '@elastic/eui';
import { FieldAggregateType } from '@postybirb/form-builder';
import { SubmissionGeneratorProps } from '../../submission-form-props';
import FieldGenerator from './field-generator';

type SubmissionFormGeneratorProps = SubmissionGeneratorProps;

type FieldEntry = {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: FieldAggregateType<any>;
};

function shouldGrow(entries: FieldEntry[]): boolean {
  // eslint-disable-next-line no-restricted-syntax
  for (const entry of entries) {
    if (entry.value.grow) {
      return true;
    }

    switch (entry.value.formField) {
      case 'checkbox':
      case 'radio':
      case 'switch':
        break;
      case 'input':
      case 'tag':
      case 'textarea':
      default:
        return true;
    }
  }

  return false;
}

export default function SubmissionFormGenerator(
  props: SubmissionFormGeneratorProps
) {
  const { submission, metadata, option, onUpdate } = props;

  if (!metadata) {
    return <div>Unable to generate form.</div>;
  }

  // Question why is the value an array again?
  const entries = Object.entries(metadata)
    .map(([key, value]) => ({ key, value: value[0] }))
    .sort((a, b) => {
      const value1 = a.value;
      const value2 = b.value;

      return (value1.row ?? 1000) - (value2.row ?? 1000);
    });

  const columns: Record<string, FieldEntry[]> = {};

  entries.forEach((entry) => {
    const column = entry.value.column || 0;
    if (!columns[column]) {
      columns[column] = [];
    }
    columns[column].push(entry);
  });

  return (
    <EuiForm>
      <EuiFlexGroup>
        {Object.entries(columns).map(([i, entry]) => (
          <EuiFlexItem
            key={i}
            grow={shouldGrow(entry)}
            style={{ flexGrow: shouldGrow(entry) ? '1' : '0' }}
          >
            {entry.map(({ key, value }) => (
              <FieldGenerator
                key={key}
                submission={submission}
                propKey={key}
                field={value}
                option={option}
                onUpdate={onUpdate}
              />
            ))}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiForm>
  );
}
