import { EuiSpacer } from '@elastic/eui';
import { getAppendFileUrl } from '../../../../../api/file-submission.api';
import { useSubmission } from '../../../../../hooks/submission/use-submission';
import Uploader from '../../../../shared/uploader/uploader';
import SubmissionFormSection from '../submission-form-section/submission-form-section';
import { fetchAndMergeSubmission } from '../utilities/submission-edit-form-utilities';
import { SubmissionFileCardContainer } from './file-card';

export default function SubmissionFileSection() {
  const { submission, updateView } = useSubmission();
  return (
    <SubmissionFormSection>
      <div className="postybirb__file-section">
        <SubmissionFileCardContainer />
        <EuiSpacer />
        <Uploader
          endpointPath={getAppendFileUrl(submission.id, 'file')}
          onComplete={() => {
            fetchAndMergeSubmission(submission, ['files', 'metadata']).finally(
              () => {
                updateView();
              }
            );
          }}
        />
      </div>
    </SubmissionFormSection>
  );
}
