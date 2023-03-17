import {
  DropResult,
  EuiButtonIcon,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFile,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { getUrlSource } from '../../../../../transports/https';
import { TextFileIcon } from '../../../../shared/icons/Icons';
import { SubmissionFormProps } from '../../submission-form-props';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-card.css';
import FileUploadButton from './file-upload-button';

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

function CardImageProvider(file: ISubmissionFile) {
  const { fileName, id, hash } = file;
  const fileType = getFileType(fileName);
  const src = `${getUrlSource()}/api/file/file/${id}?${hash}`;
  switch (fileType) {
    case FileType.AUDIO:
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls style={{ height: '100px', width: '100px' }}>
          <source src={src} type="audio/ogg" />
          <source src={src} type="audio/mpeg" />
          <source src={src} type="audio/mp3" />
          <source src={src} type="audio/mpeg3" />
          <source src={src} type="audio/wav" />
          Your browser does not support the audio tag.
        </audio>
      );
    case FileType.TEXT:
      return (
        <EuiIcon
          style={{ height: '100px', width: '100px' }}
          type={TextFileIcon}
        />
      );
    case FileType.VIDEO:
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video width="150" height="100" controls>
          <source src={src} type="video/mp4" />
          <source src={src} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      );
    case FileType.UNKNOWN:
    case FileType.IMAGE:
    default:
      return <EuiImage size={100} allowFullScreen alt={fileName} src={src} />;
  }
}

// TODO Add thumbnail
// TODO remove thumbnail
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
        <EuiSplitPanel.Inner className="postybirb__file-card-primary">
          <div className="text-center">
            <CardImageProvider {...file} />
            <div>
              <FileUploadButton
                submission={submission}
                submissionFile={file}
                accept="*"
                label="Change file"
                onUpdate={onUpdate}
              />
            </div>
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="postybirb__file-card-thumbnail">
          <div className="text-center">
            {file.hasThumbnail ? (
              <EuiImage
                size={100}
                allowFullScreen
                alt={file.fileName}
                src={`${getUrlSource()}/api/file/thumbnail/${file.id}`}
              />
            ) : (
              <div>TBD</div>
            )}
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="postybirb__file-card-details">
          <div>Details TBD</div>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner className="postybirb__file-card-info">
        <EuiTitle size="xxxs" className="text-center">
          <h2>
            <span>{index}.</span>
            <span className="ml-1">{file.fileName}</span>
            {submission.files.length > 1 ? (
              <EuiButtonIcon
                className="ml-1"
                iconType="trash"
                aria-label={`Remove ${file.fileName}`}
                color="danger"
                onClick={() => {
                  removeFile(submission.id, file).then((update) => {
                    mergeSubmission(submission, update.body, [
                      'files',
                      'metadata',
                    ]);
                    onUpdate();
                  });
                }}
              />
            ) : null}
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
            <EuiDraggable
              key={`${file.id}-${file.hash}`}
              index={i}
              draggableId={`${file.id}-${file.hash}`}
            >
              {(_, state) => (
                <div className="postybirb__file-card-flex-item my-2">
                  <FileCard
                    key={`file-card-${file.id}-${file.hash}`}
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
