import { SubmissionType } from '@postybirb/types';

type SubmissionTemplateManagementViewProps = {
  type: SubmissionType;
};

export default function SubmissionTemplateManagementView(
  props: SubmissionTemplateManagementViewProps
) {
  const { type } = props;
  return <div>Hi</div>;
}
