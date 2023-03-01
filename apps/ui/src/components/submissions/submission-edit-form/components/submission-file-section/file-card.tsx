import {
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import { ISubmissionFile } from '@postybirb/types';
import { useMemo } from 'react';
import SubmissionsApi from '../../../../../api/submission.api';
import { getUrlSource } from '../../../../../transports/https';
import { SubmissionFormProps } from '../../submission-form-props';
import './file-card.css';

type SubmissionFileCardContainerProps = SubmissionFormProps;

type SubmissionFileCardProps = SubmissionFormProps & {
  file: ISubmissionFile;
};

function removeFile(submissionId: string, file: ISubmissionFile) {
  return SubmissionsApi.removeFile(submissionId, file.id);
}

// TODO Add thumbnail
// TODO remove thumbnail
// TODO display real image
// TODO have display for files that aren't image based
function FileCard(props: SubmissionFileCardProps) {
  const { submission, file, onUpdate } = props;

  return (
    <EuiSplitPanel.Outer className="postybirb__file-card">
      <EuiSplitPanel.Outer
        hasShadow={false}
        direction="row"
        className="postybirb__file-card-display"
      >
        <EuiSplitPanel.Inner className="w-1/2 postybirb__file-card-primary">
          <div className="text-center">
            <EuiImage
              size={100}
              allowFullScreen
              alt={file.fileName}
              src={`${getUrlSource()}/api/file/thumbnail/${file.id}`}
            />
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="w-1/2 postybirb__file-card-thumbnail">
          <div className="text-center">
            <EuiImage
              size={100}
              allowFullScreen
              alt={file.fileName}
              src={`${getUrlSource()}/api/file/thumbnail/${file.id}`}
            />
          </div>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner className="postybirb__file-card-info">
        <EuiTitle size="xxxs" className="text-center">
          <h2>
            {file.fileName}
            <EuiButtonIcon
              className="ml-1"
              iconType="trash"
              aria-label={`Remove ${file.fileName}`}
              color="danger"
              onClick={() => {
                removeFile(submission.id, file).finally(() => {
                  onUpdate();
                });
              }}
            />
          </h2>
        </EuiTitle>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}

export function SubmissionFileCardContainer(
  props: SubmissionFileCardContainerProps
) {
  const { submission, onUpdate } = props;

  const fileCards = useMemo(
    () =>
      submission.files.map((file) => (
        <EuiFlexItem className="postybirb__file-card-flex-item">
          <FileCard {...props} file={file} />
        </EuiFlexItem>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submission.files, onUpdate]
  );

  return (
    <EuiFlexGrid columns={4} className="postybirb__file-card-container">
      {fileCards}
    </EuiFlexGrid>
  );
}
