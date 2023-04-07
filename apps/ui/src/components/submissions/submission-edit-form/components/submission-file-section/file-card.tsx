import {
  DropResult,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
} from '@elastic/eui';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFile,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { getUrlSource } from '../../../../../transports/https';
import { TextFileIcon } from '../../../../shared/icons/Icons';
import { SubmissionFormProps } from '../../submission-form-props';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-card.css';
import { FileDetails } from './file-details';
import FileUploadButton from './file-upload-button';

type SubmissionFileCardContainerProps = SubmissionFormProps;

type SubmissionFileCardProps = SubmissionFormProps & {
  file: ISubmissionFile;
  isDragging: boolean;
};

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

// TODO ignore prop
function FileCard(props: SubmissionFileCardProps) {
  const { isDragging, submission, file, onUpdate, validation } = props;
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
                label="Change file"
                endpointPath={`api/submission/file/replace/${submission.id}/${file.id}`}
                onComplete={(dto) => {
                  mergeSubmission(submission, dto, ['files', 'metadata']);
                  onUpdate();
                }}
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
                src={`${getUrlSource()}/api/file/thumbnail/${
                  file.id
                }?${Date.now()}`}
              />
            ) : null}
            <div>
              <FileUploadButton
                compress
                accept={['image/*']}
                label="Change thumbnail"
                endpointPath={`api/submission/thumbnail/replace/${submission.id}/${file.id}`}
                onComplete={(dto) => {
                  mergeSubmission(submission, dto, ['files', 'metadata']);
                  onUpdate();
                }}
              />
            </div>
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="postybirb__file-card-details">
          <FileDetails
            submission={submission}
            onUpdate={onUpdate}
            file={file}
            validation={validation}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
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
