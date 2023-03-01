import { EuiSpacer } from '@elastic/eui';
import Uploader from '../../../../shared/uploader/uploader';
import { SubmissionFormProps } from '../../submission-form-props';
import SubmissionFormSection from '../submission-form-section/submission-form-section';
import { FetchAndMergeSubmission } from '../utilities/submission-edit-form-utilities';
import { SubmissionFileCardContainer } from './file-card';

type SubmissionFileSectionProps = SubmissionFormProps;

export default function SubmissionFileSection(
  props: SubmissionFileSectionProps
) {
  const { submission, onUpdate } = props;

  return (
    <SubmissionFormSection>
      <div className="postybirb__file-section">
        <SubmissionFileCardContainer {...props} />
        <EuiSpacer />
        <Uploader
          endpointPath={`api/submission/file/add/${submission.id}`}
          onComplete={() => {
            FetchAndMergeSubmission(submission, 'files').finally(() => {
              onUpdate();
            });
          }}
        />
      </div>
    </SubmissionFormSection>
  );
}
