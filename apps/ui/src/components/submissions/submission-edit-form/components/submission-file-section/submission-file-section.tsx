import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ISubmissionFile } from '@postybirb/types';
import Uploader from 'apps/ui/src/components/shared/uploader/uploader';
import { useMemo } from 'react';
import { getUrlSource } from '../../../../../transports/https';
import { SubmissionFormProps } from '../../submission-form-props';
import SubmissionFormSection from '../submission-form-section/submission-form-section';
import { FetchAndMergeSubmission } from '../utilities/submission-edit-form-utilities';

type SubmissionFileSectionProps = SubmissionFormProps;
type FileCardProps = SubmissionFileSectionProps & {
  file: ISubmissionFile;
};

function FileCard(props: FileCardProps) {
  const { file, onUpdate } = props;

  return (
    <EuiCard
      title={file.fileName}
      description="Hi"
      image={`${getUrlSource()}/api/file/thumbnail/${file.id}`}
    />
  );
}

export default function SubmissionFileSection(
  props: SubmissionFileSectionProps
) {
  const { submission, validation, onUpdate } = props;
  const fileCards = useMemo(
    () =>
      submission.files.map((file) => (
        <EuiFlexItem grow={false}>
          <FileCard {...props} file={file} />
        </EuiFlexItem>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submission.files, onUpdate]
  );

  return (
    <SubmissionFormSection>
      <div className="postybirb__file-section">
        <EuiFlexGroup gutterSize="l">{fileCards}</EuiFlexGroup>
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
