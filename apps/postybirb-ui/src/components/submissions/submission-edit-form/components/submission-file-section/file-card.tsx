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
import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { getReplaceFileUrl } from '../../../../../api/file-submission.api';
import { useSubmission } from '../../../../../hooks/submission/use-submission';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { defaultTargetProvider } from '../../../../../transports/http-client';
import { TextFileIcon } from '../../../../shared/icons/Icons';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-card.css';
import { FileDetails } from './file-details';
import FileUploadButton from './file-upload-button';

type SubmissionFileCardProps = {
  file: ISubmissionFileDto;
  isDragging: boolean;
};

function orderFiles(
  submission: SubmissionDto<FileSubmissionMetadata>
): ISubmissionFileDto[] {
  const { metadata, files } = submission;
  const { order } = metadata;

  const orderedFiles: ISubmissionFileDto[] = Array(order.length);
  files.forEach((file) => {
    const index = order.findIndex((id) => id === file.id);
    if (index > -1) {
      orderedFiles[index] = file;
    }
  });

  return orderedFiles.filter((f) => !!f);
}

function CardImageProvider(file: ISubmissionFileDto) {
  const { fileName, id, hash } = file;
  const fileType = getFileType(fileName);
  const src = `${defaultTargetProvider()}/api/file/file/${id}?${hash}`;
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
          <Trans>Your browser does not support the audio tag.</Trans>
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
          <Trans>Your browser does not support the video tag.</Trans>
        </video>
      );
    case FileType.UNKNOWN:
    case FileType.IMAGE:
    default:
      return <EuiImage size={100} allowFullScreen alt={fileName} src={src} />;
  }
}

function FileCard(props: SubmissionFileCardProps) {
  const { submission, updateView } = useSubmission();
  const { _ } = useLingui();
  const { isDragging, file } = props;
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
            <strong>
              <Trans comment="Main file data">Primary</Trans>
            </strong>
            <CardImageProvider {...file} />
            <div>
              <FileUploadButton
                label={_(msg`Change file`)}
                endpointPath={getReplaceFileUrl(submission.id, file.id, 'file')}
                onComplete={(dto) => {
                  mergeSubmission(submission, dto, ['files', 'metadata']);
                  updateView();
                }}
              />
            </div>
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="postybirb__file-card-thumbnail">
          <div className="text-center">
            <strong>
              <Trans>Thumbnail</Trans>
            </strong>
            {file.hasThumbnail ? (
              <EuiImage
                size={100}
                allowFullScreen
                alt={file.fileName}
                src={`${defaultTargetProvider()}/api/file/thumbnail/${
                  file.id
                }?${Date.now()}`}
              />
            ) : null}
            <div>
              <FileUploadButton
                compress
                accept={['image/*']}
                label={_(msg`Change thumbnail`)}
                endpointPath={getReplaceFileUrl(
                  submission.id,
                  file.id,
                  'thumbnail'
                )}
                onComplete={(dto) => {
                  mergeSubmission(submission, dto, ['files', 'metadata']);
                  updateView();
                }}
              />
            </div>
          </div>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner className="postybirb__file-card-details">
          <FileDetails file={file} />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiSplitPanel.Outer>
  );
}

export function SubmissionFileCardContainer() {
  const { submission, updateView } = useSubmission();
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

      updateView();
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
