import { EuiForm } from '@elastic/eui';
import { SubmissionGeneratorProps } from '../../submission-form-props';
import FieldGenerator from './field-generator';

type SubmissionFormGeneratorProps = SubmissionGeneratorProps;

export default function SubmissionFormGenerator(
  props: SubmissionFormGeneratorProps
) {
  const { submission, metadata, option, onUpdate } = props;

  if (!metadata) {
    return <div>Unable to generate form.</div>;
  }

  // Question why is the value an array again?
  const generatedFields = Object.entries(metadata).map(([key, value]) => (
    <FieldGenerator
      key={key}
      submission={submission}
      propKey={key}
      field={value[0]}
      option={option}
      onUpdate={onUpdate}
    />
  ));

  return <EuiForm>{generatedFields}</EuiForm>;
}
