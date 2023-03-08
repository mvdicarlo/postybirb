import {
  DropResult,
  EuiButtonIcon,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiHorizontalRule,
  EuiImage,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import { FileSubmissionMetadata, ISubmissionFile } from '@postybirb/types';
import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { getUrlSource } from '../../../../../transports/https';
import { SubmissionFormProps } from '../../submission-form-props';
import { fetchAndMergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-card.css';

type SubmissionFileCardContainerProps = SubmissionFormProps;

type SubmissionFileCardProps = SubmissionFormProps & {
  file: ISubmissionFile;
  index: number;
  isDragging: boolean;
};

function removeFile(submissionId: string, file: ISubmissionFile) {
  return SubmissionsApi.removeFile(submissionId, file.id);
}

function orderFiles(
  submission: SubmissionDto<FileSubmissionMetadata>
): ISubmissionFile[] {
  const { metadata, files } = submission;
  const { order } = metadata;

  const orderedFiles: ISubmissionFile[] = Array(order.length);
  files.forEach((file) => {
    const index = order.findIndex((id) => id === file.id);
    if (index > -1) {
      orderedFiles[index] = file;
    }
  });

  return orderedFiles.filter((f) => !!f);
}

// TODO Add thumbnail
// TODO remove thumbnail
// TODO display real image
// TODO have display for files that aren't image based
// TODO better layout
// TODO dimensions
// TODO ignore prop
function FileCard(props: SubmissionFileCardProps) {
  const { isDragging, index, submission, file, onUpdate } = props;

  return (
    <EuiSplitPanel.Outer
      className="postybirb__file-card"
      hasShadow={isDragging}
    >
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
            <span>{index}.</span>
            <span className="ml-1">{file.fileName}</span>
            <EuiButtonIcon
              className="ml-1"
              iconType="trash"
              aria-label={`Remove ${file.fileName}`}
              color="danger"
              onClick={() => {
                removeFile(submission.id, file).finally(() => {
                  fetchAndMergeSubmission(submission, 'files').finally(() => {
                    onUpdate();
                  });
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
  const orderedFiles = orderFiles(
    submission as SubmissionDto<FileSubmissionMetadata>
  );

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (source && destination) {
      const list = [
        ...(submission as SubmissionDto<FileSubmissionMetadata>).metadata.order,
      ];
      const items = euiDragDropReorder(list, source.index, destination.index);
      (submission as SubmissionDto<FileSubmissionMetadata>).metadata.order =
        items;

      onUpdate();
    }
  };

  return (
    <div className="postybirb__file-card-container">
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId={submission.id}>
          {orderedFiles.map((file, i) => (
            <EuiDraggable key={file.id} index={i} draggableId={file.id}>
              {(_, state) => (
                <div
                  className="postybirb__file-card-flex-item my-2"
                  title={file.id}
                >
                  <FileCard
                    key={`${file.id}`}
                    {...props}
                    file={file}
                    index={i + 1}
                    isDragging={state.isDragging}
                  />
                </div>
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    </div>
  );
}
