import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    FileButton,
    Group,
    Image,
    Text,
    Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { FileType, ISubmissionFileDto, SubmissionId } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconCrop,
    IconFileText,
    IconFileUpload,
    IconReplace,
} from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi, {
    FileUpdateTarget,
} from '../../../../../api/file-submission.api';
import { CommonTranslations } from '../../../../../translations/common-translations';
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
        <audio controls style={{ height: 60, width: 70 }}>
          <source src={src} type="audio/ogg" />
          <source src={src} type="audio/mpeg" />
          <source src={src} type="audio/mp3" />
          <source src={src} type="audio/mpeg3" />
          <source src={src} type="audio/wav" />
          <source src={src} type="audio/webm" />
          <source src={src} type="audio/aac" />
          <source src={src} type="audio/flac" />
          <source src={src} type="audio/x-m4a" />
        </audio>
      );
    case FileType.TEXT:
      return (
        <IconFileText style={{ display: 'block' }} height={50} width={30} />
      );
    case FileType.VIDEO:
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video width={70} height={60} controls>
          <source src={src} type="video/mp4" />
          <source src={src} type="video/ogg" />
          <source src={src} type="video/webm" />
          <source src={src} type="video/x-matroska" />
          <source src={src} type="video/quicktime" />
        </video>
      );
    case FileType.UNKNOWN:
    case FileType.IMAGE:
    default:
      return (
        <Image
          radius={4}
          loading="lazy"
          h={60}
          w={70}
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
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <Box ta="center" key="primary" w={90}>
          <Badge
            variant="filled"
            color="blue"
            radius="sm"
            mb={4}
            size="xs"
            fullWidth
            style={{ textTransform: 'none' }}
          >
            <Trans comment="Main file data">Primary</Trans>
          </Badge>

          <Box
            style={{
              borderRadius: '6px',
              overflow: 'hidden',
              // eslint-disable-next-line lingui/no-unlocalized-strings
              border: '1px solid var(--mantine-color-dark-4)',
              background: 'var(--mantine-color-dark-7)',
              height: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CardImageProvider {...file} />
          </Box>

          <Group justify="center" mt={4} gap={4}>
            <FileButton
              onChange={(payload) => {
                if (payload) {
                  const newFileType = getFileType(payload.name);
                  // Only allow replacing files with the same type
                  if (fileType !== newFileType) {
                    notifications.show({
                      title: <CommonTranslations.NounUpdateFailed />,
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
                <Tooltip label={<Trans>Replace</Trans>} withArrow>
                  <ActionIcon {...p} variant="light" color="blue" size="xs">
                    <IconReplace size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Box>

        <Divider orientation="vertical" />

        <Box ta="center" key="thumbnail" w={90}>
          <Badge
            variant="outline"
            color="gray"
            radius="sm"
            mb={4}
            size="xs"
            fullWidth
            style={{ textTransform: 'none' }}
          >
            <Trans>Thumb</Trans>
          </Badge>

          <Box
            style={{
              borderRadius: '6px',
              overflow: 'hidden',
              // eslint-disable-next-line lingui/no-unlocalized-strings
              border: '1px solid var(--mantine-color-dark-4)',
              background: 'var(--mantine-color-dark-7)',
              height: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {file.hasThumbnail ? (
              <Image
                radius={0}
                height={60}
                width={70}
                fit="contain"
                loading="lazy"
                alt={file.fileName}
                src={`${defaultTargetProvider()}/api/file/thumbnail/${
                  file.id
                }?${Date.now()}`}
              />
            ) : (
              <Text size="xs" c="dimmed">
                <Trans>None</Trans>
              </Text>
            )}
          </Box>

          <Group justify="center" mt={4} gap={4}>
            {fileType === FileType.IMAGE ? (
              <Tooltip label={<Trans>Crop from primary</Trans>} withArrow>
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="xs"
                  onClick={() => {
                    setCropFromPrimary(true);
                  }}
                >
                  <IconCrop size={12} />
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
                <Tooltip label={<Trans>Upload thumbnail</Trans>} withArrow>
                  <ActionIcon {...p} variant="light" color="indigo" size="xs">
                    <IconFileUpload size={12} />
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
