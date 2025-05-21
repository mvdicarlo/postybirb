/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Image,
  Progress,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  Dropzone,
  FileWithPath,
  IMAGE_MIME_TYPE,
  MS_WORD_MIME_TYPE,
  PDF_MIME_TYPE,
} from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { FileType, SubmissionType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconCheck,
  IconDeviceAudioTape,
  IconExclamationCircle,
  IconFileUpload,
  IconPhoto,
  IconPhotoEdit,
  IconTextCaption,
  IconTrash,
  IconUpload,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi from '../../../api/file-submission.api';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { EditImageModal } from './edit-image-modal';
import './submission-uploader.css';

export const TEXT_MIME_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/*',
  'application/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/x-m4v', 'video/*'];

async function uploadFiles({
  files,
  onComplete,
  appendToSubmission,
}: {
  files: File[];
  onComplete: () => void;
} & SubmissionUploaderProps) {
  const snapshot = [...files];
  if (appendToSubmission && appendToSubmission.type === SubmissionType.FILE) {
    await fileSubmissionApi.appendFiles(
      appendToSubmission.id,
      'file',
      snapshot,
    );
  }
  await submissionApi.createFileSubmission(SubmissionType.FILE, snapshot);
  onComplete();
}

function Preview({
  file,
  onEdit,
  onDelete,
}: {
  file: FileWithPath;
  onEdit: (file: FileWithPath) => void;
  onDelete: (file: FileWithPath) => void;
}) {
  const type = getFileType(file.name);
  let icon;
  let color;

  switch (type) {
    case FileType.VIDEO:
      icon = <IconVideo size={24} />;
      color = 'violet';
      break;
    case FileType.AUDIO:
      icon = <IconDeviceAudioTape size={24} />;
      color = 'orange';
      break;
    case FileType.TEXT:
      icon = <IconTextCaption size={24} />;
      color = 'teal';
      break;
    case FileType.IMAGE:
    default:
      icon = <IconPhoto size={24} />;
      color = 'blue';
  }

  let preview = (
    <ThemeIcon size={40} radius="md" variant="light" color={color}>
      {icon}
    </ThemeIcon>
  );

  if (type === FileType.IMAGE) {
    const imageUrl = URL.createObjectURL(file);
    preview = (
      <Image
        src={imageUrl}
        onLoad={() => URL.revokeObjectURL(imageUrl)}
        alt={file.name}
        height={40}
        width={40}
        radius="md"
        fit="cover"
      />
    );
  }

  return (
    <Card withBorder p="xs" radius="md">
      <Flex align="center" gap="md">
        {preview}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" lineClamp={1} fw={500}>
            {file.name}
          </Text>
          <Text size="xs" c="dimmed">
            {(file.size / 1024 / 1024).toFixed(2)} MB • {type}
          </Text>
        </Box>
        <Group gap="xs">
          {type === FileType.IMAGE && !file.type.includes('gif') && (
            <Tooltip label={<Trans>Edit image</Trans>} withArrow position="top">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => onEdit(file)}
              >
                <IconPhotoEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={<Trans>Remove</Trans>} withArrow position="top">
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => onDelete(file)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>
    </Card>
  );
}

function UploadButton({
  files,
  onComplete,
  appendToSubmission,
}: {
  files: FileWithPath[];
  onComplete: () => void;
} & SubmissionUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    setIsUploading(true);
    setProgress(0);

    try {
      const interval = setInterval(() => {
        setProgress((current) => {
          const next = current + 10;
          if (next >= 90) {
            clearInterval(interval);
            return 90;
          }
          return next;
        });
      }, 300);

      await uploadFiles({
        files: files as File[],
        onComplete: () => {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            onComplete();
          }, 500);
        },
        appendToSubmission,
      });

      notifications.show({
        title: <Trans>Upload complete</Trans>,
        message: <Trans>Files have been uploaded successfully</Trans>,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: <Trans>Upload failed</Trans>,
        message: (error as Error).message || (
          <Trans>An error occurred during upload</Trans>
        ),
        color: 'red',
        icon: <IconExclamationCircle size={16} />,
      });
      setIsUploading(false);
    }
  };

  return (
    <Box>
      {isUploading && (
        <Progress value={progress} mb="xs" size="sm" radius="xl" />
      )}
      <Button
        loading={isUploading}
        onClick={handleUpload}
        variant={isUploading ? 'light' : 'filled'}
        leftSection={<IconFileUpload size={16} />}
        disabled={!files.length}
        fullWidth
        radius="md"
        size="md"
      >
        {isUploading ? (
          <Trans>Uploading...</Trans>
        ) : files.length > 0 ? (
          <Trans>Upload {files.length} files</Trans>
        ) : (
          <Trans>Upload</Trans>
        )}
      </Button>
    </Box>
  );
}

type SubmissionUploaderProps = {
  appendToSubmission?: SubmissionDto;
};

export function SubmissionUploader(props: SubmissionUploaderProps) {
  const { appendToSubmission } = props;
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [cropFile, setCropFile] = useState<FileWithPath | null>(null);

  const onDelete = (file: FileWithPath) => {
    const index = files.findIndex((f) => f.name === file.name);
    if (index !== -1) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);
    }
  };

  const onEdit = (croppedFile?: FileWithPath, blob?: Blob | null) => {
    setCropFile(null);
    if (croppedFile && blob) {
      const blobAsFile = new File([blob], croppedFile.name, {
        type: croppedFile.type,
      });
      const index = files.findIndex((f) => f.name === croppedFile.name);
      if (index !== -1) {
        const newFiles = [...files];
        newFiles[index] = blobAsFile;
        setFiles(newFiles);
      }
    }
  };

  return (
    <>
      <Card withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          {files.length === 0 ? (
            <Dropzone
              onDrop={(newFiles) => setFiles([...files, ...newFiles])}
              maxSize={100 * 1024 ** 2}
              accept={[
                ...IMAGE_MIME_TYPE,
                ...MS_WORD_MIME_TYPE,
                ...PDF_MIME_TYPE,
                ...TEXT_MIME_TYPES,
                ...VIDEO_MIME_TYPES,
              ]}
              multiple
              className="dropzone-primary"
              p="xl"
              radius="md"
            >
              <Stack
                align="center"
                justify="center"
                gap="xs"
                style={{ pointerEvents: 'none' }}
              >
                <Dropzone.Accept>
                  <ThemeIcon size={80} radius="xl" color="blue">
                    <IconUpload size={36} />
                  </ThemeIcon>
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <ThemeIcon size={80} radius="xl" color="red">
                    <IconX size={36} />
                  </ThemeIcon>
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <ThemeIcon size={80} radius="xl" variant="light" color="gray">
                    <IconFileUpload size={36} />
                  </ThemeIcon>
                </Dropzone.Idle>

                <Text size="xl" fw={600} ta="center">
                  <Trans>Drop files here or click to browse</Trans>
                </Text>
                <Text size="sm" c="dimmed" ta="center" maw={500} mx="auto">
                  <Trans>
                    Supports images, videos, audio, and text files up to 100MB
                  </Trans>
                </Text>
              </Stack>
            </Dropzone>
          ) : (
            <Box>
              <Flex justify="space-between" align="center" mb="md">
                <Text fw={600} size="md">
                  <Trans>Files to upload ({files.length})</Trans>
                </Text>
                <Button
                  variant="outline"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  size="xs"
                  onClick={() => setFiles([])}
                >
                  <Trans>Clear all</Trans>
                </Button>
              </Flex>

              <ScrollArea
                h={Math.min(250, Math.max(70, files.length * 60))}
                mb="md"
                offsetScrollbars
              >
                <Stack gap="xs">
                  {files.map((file) => (
                    <Preview
                      file={file}
                      key={file.name}
                      onEdit={setCropFile}
                      onDelete={onDelete}
                    />
                  ))}
                </Stack>
              </ScrollArea>

              <Dropzone
                onDrop={(newFiles) => setFiles([...files, ...newFiles])}
                maxSize={100 * 1024 ** 2}
                accept={[
                  ...IMAGE_MIME_TYPE,
                  ...MS_WORD_MIME_TYPE,
                  ...PDF_MIME_TYPE,
                  ...TEXT_MIME_TYPES,
                  ...VIDEO_MIME_TYPES,
                ]}
                multiple
                className="dropzone-secondary"
                p="sm"
                mb="md"
                radius="md"
              >
                <Flex
                  align="center"
                  justify="center"
                  gap="sm"
                  style={{ pointerEvents: 'none' }}
                >
                  <ThemeIcon size="md" radius="xl" variant="light" color="gray">
                    <IconFileUpload size={16} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    <Trans>Drop files here or click to add more</Trans>
                  </Text>
                </Flex>
              </Dropzone>

              <UploadButton
                appendToSubmission={appendToSubmission}
                files={files}
                onComplete={() => setFiles([])}
              />
            </Box>
          )}
        </Stack>
      </Card>

      {cropFile && <EditImageModal file={cropFile} onClose={onEdit} />}
    </>
  );
}
