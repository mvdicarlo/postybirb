import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  FileButton,
  Group,
  Image,
  Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { FileType, ISubmissionFileDto, SubmissionId } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconCrop, IconFileText, IconFileUpload } from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi, {
  FileUpdateTarget,
} from '../../../../../api/file-submission.api';
import { defaultTargetProvider } from '../../../../../transports/http-client';
import {
  EditImageFromSource,
  EditImageModal,
} from '../../../submission-uploader/edit-image-modal';

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
        <IconFileText style={{ display: 'block' }} height={100} width={50} />
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
      return (
        <Image
          radius={4}
          loading="lazy"
          h={100}
          fit="contain"
          alt={fileName}
          src={src}
        />
      );
  }
}

type FileCardFileActionsProps = {
  submissionId: SubmissionId;
  file: ISubmissionFileDto;
};

function replaceFile(
  submissionId: SubmissionId,
  blob: Blob,
  file: ISubmissionFileDto,
  target: FileUpdateTarget,
) {
  return fileSubmissionApi.replaceFile(submissionId, file.id, target, blob);
}

export function FileCardFileActions(props: FileCardFileActionsProps) {
  const { submissionId, file } = props;
  const fileType = getFileType(file.fileName);
  const [thumbnailBlob, setThumbnailBlob] = useState<FileWithPath | null>(null);
  const [primaryBlob, setPrimaryBlob] = useState<FileWithPath | null>(null);
  const [cropFromPrimary, setCropFromPrimary] = useState(false);

  const onEditOrReplace = (
    target: FileUpdateTarget,
    blob: Blob,
    croppedFile?: Pick<FileWithPath, 'type' | 'name'>,
  ) => {
    let newFileBlob: Blob = blob;
    if (croppedFile && blob) {
      newFileBlob = new File([blob], croppedFile.name, {
        type: croppedFile.type,
      });
      replaceFile(submissionId, newFileBlob, file, target);
    }
  };

  return (
    <>
      {cropFromPrimary ? (
        <EditImageFromSource
          file={file}
          onClose={(_, blob) => {
            setCropFromPrimary(false);
            if (blob) {
              onEditOrReplace('thumbnail', blob, {
                name: file.fileName,
                type: file.mimeType,
              });
            }
          }}
        />
      ) : null}
      {thumbnailBlob ? (
        <EditImageModal
          file={thumbnailBlob}
          onClose={(edit, blob) => {
            setThumbnailBlob(null);
            if (edit && blob) {
              onEditOrReplace('thumbnail', blob, edit);
            }
          }}
        />
      ) : null}
      {primaryBlob ? (
        <EditImageModal
          file={primaryBlob}
          onClose={(edit, blob) => {
            setPrimaryBlob(null);
            if (edit && blob) {
              onEditOrReplace('file', blob, edit);
            }
          }}
        />
      ) : null}
      <Group gap="sm" key="file-previews">
        <Box ta="center" key="primary">
          <strong>
            <Trans comment="Main file data">Primary</Trans>
          </strong>
          <CardImageProvider {...file} />
          <Group justify="center" mt="4">
            <FileButton
              onChange={(payload) => {
                if (payload) {
                  const newFileType = getFileType(payload.name);
                  // Only allow replacing files with the same type
                  if (fileType !== newFileType) {
                    notifications.show({
                      title: <Trans>Invalid file type</Trans>,
                      message: (
                        <Trans>
                          File types do not match. Please upload a file of the
                          same type.
                        </Trans>
                      ),
                      color: 'red',
                    });
                    return;
                  }

                  // Allow crop on images
                  if (
                    fileType === FileType.IMAGE &&
                    (payload.type === 'image/png' ||
                      payload.type === 'image/jpeg')
                  ) {
                    setPrimaryBlob(payload);
                  } else {
                    replaceFile(submissionId, payload, file, 'file');
                  }
                }

                setPrimaryBlob(payload);
              }}
            >
              {(p) => (
                <Tooltip label={<Trans>Update file</Trans>}>
                  <ActionIcon {...p} variant="subtle">
                    <IconFileUpload />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Box>
        <Box ta="center" key="thumbnail">
          <strong>
            <Trans>Thumbnail</Trans>
          </strong>
          {file.hasThumbnail ? (
            <Image
              radius={4}
              h={100}
              fit="fill"
              loading="lazy"
              alt={file.fileName}
              src={`${defaultTargetProvider()}/api/file/thumbnail/${
                file.id
              }?${Date.now()}`}
            />
          ) : null}
          <Group justify="center" mt="4">
            {fileType === FileType.IMAGE ? (
              <Tooltip
                label={<Trans>Crop new thumbnail from original file</Trans>}
              >
                <ActionIcon
                  variant="subtle"
                  onClick={() => {
                    setCropFromPrimary(true);
                  }}
                >
                  <IconCrop />
                </ActionIcon>
              </Tooltip>
            ) : null}
            <FileButton
              accept="image/*"
              onChange={(payload) => {
                if (payload && getFileType(payload.name) === FileType.IMAGE) {
                  setThumbnailBlob(payload);
                }
              }}
            >
              {(p) => (
                <Tooltip label={<Trans>Upload new thumbnail</Trans>}>
                  <ActionIcon {...p} variant="subtle">
                    <IconFileUpload />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Box>
      </Group>
    </>
  );
}
