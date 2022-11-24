import { EuiForm } from '@elastic/eui';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import { ISubmissionOptions, BaseWebsiteOptions } from '@postybirb/types';
import FieldGenerator from './field-generator/field-generator';

type SubmissionFormGeneratorProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: FormBuilderMetadata<any> | undefined;
  option: ISubmissionOptions<BaseWebsiteOptions>;
  onUpdate: () => void;
};

export default function SubmissionFormGenerator(
  props: SubmissionFormGeneratorProps
) {
  const { metadata, option, onUpdate } = props;

  if (!metadata) {
    return <div>Unable to generate form.</div>;
  }

  console.log(metadata);
  // Question why is the value an array again?
  const generatedFields = Object.entries(metadata).map(([key, value]) => (
    <FieldGenerator
      key={key}
      propKey={key}
      field={value[0]}
      option={option}
      onUpdate={onUpdate}
    />
  ));

  return <EuiForm>{generatedFields}</EuiForm>;
}
