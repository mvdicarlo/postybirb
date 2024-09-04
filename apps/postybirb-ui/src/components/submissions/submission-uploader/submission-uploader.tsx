/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  rem,
} from '@mantine/core';
import {
  Dropzone,
  FileWithPath,
  IMAGE_MIME_TYPE,
  MS_WORD_MIME_TYPE,
  PDF_MIME_TYPE,
} from '@mantine/dropzone';
import { FileType, SubmissionType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconDeviceAudioTape,
  IconPhoto,
  IconPhotoEdit,
  IconTextCaption,
  IconTrash,
  IconUpload,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useEffect, useState } from 'react';
import fileSubmissionApi from '../../../api/file-submission.api';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

export const TEXT_MIME_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/*',
];

function Preview({
  file,
  onEdit,
  onDelete,
}: {
  file: FileWithPath;
  onEdit: (file: FileWithPath) => void;
  onDelete: (file: FileWithPath) => void;
}) {
  const imageUrl = URL.createObjectURL(file);
  const height = '40px';
  const width = '40px';

  const type = getFileType(file.name);

  let view = null;

  if (type === FileType.VIDEO) {
    view = <IconVideo width={width} height={height} />;
  } else if (type === FileType.AUDIO) {
    view = <IconDeviceAudioTape width={width} height={height} />;
  } else if (type === FileType.TEXT) {
    view = <IconTextCaption width={width} height={height} />;
  } else if (type === FileType.IMAGE) {
    view = (
      <Image
        src={imageUrl}
        onLoad={() => URL.revokeObjectURL(imageUrl)}
        alt={file.name}
        height={height}
        width={width}
        fit="contain"
      />
    );
  }

  return (
    <Paper shadow="md">
      <Flex>
        <Tooltip label={file.name} position="top" withArrow>
          <Box>{view}</Box>
        </Tooltip>
        <Text
          ml="xl"
          c="dimmed"
          flex="10"
          style={{
            alignSelf: 'center',
          }}
          size="lg"
        >
          <em>{file.name}</em>
        </Text>
        <Group mx="xl">
          {type === FileType.IMAGE && (
            <Tooltip label={<Trans>Crop</Trans>} position="top" withArrow>
              <ActionIcon variant="subtle" onClick={() => onEdit(file)}>
                <IconPhotoEdit />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={<Trans>Delete</Trans>} position="top" withArrow>
            <ActionIcon variant="subtle" c="red" onClick={() => onDelete(file)}>
              <IconTrash />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>
    </Paper>
  );
}

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/x-m4v', 'video/*'];

function EditImageModal({
  file,
  onClose,
}: {
  file: FileWithPath;
  onClose: (edit?: FileWithPath, blob?: Blob | null) => void;
}) {
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [, setImageData] = useState<Cropper.ImageData | null>(null);
  const [hasCrop, setHasCrop] = useState(false);

  const setup = () => {
    const img = document.getElementById('crop-img') as HTMLImageElement;
    if (img && !cropper) {
      const c = new Cropper(img, {
        autoCropArea: 1,
        ready() {
          setImageData(c.getImageData());
        },
        crop() {
          if (hasCrop) return;
          setHasCrop(true);
        },
      });
      setCropper(c);
    }
  };

  useEffect(
    () => () => {
      if (cropper) {
        cropper.destroy();
        setCropper(null);
      }
    },
    [cropper]
  );

  return (
    <Modal key="cropper-modal" fullScreen opened onClose={onClose}>
      <Modal.Body p={6}>
        <img
          id="crop-img"
          key={file.name}
          src={URL.createObjectURL(file)}
          style={{ height: 'calc(100vh - 175px)', width: '100%' }}
          onLoad={() => {
            URL.revokeObjectURL(file.name);
            setup();
          }}
          alt={file.name}
        />
        <Box ta="center" mt="xs">
          <Button
            w="50%"
            onClick={() =>
              cropper
                ?.getCroppedCanvas()
                .toBlob((blob) => onClose(file, blob), file.type, 1)
            }
          >
            <Trans>Crop</Trans>
          </Button>
        </Box>
      </Modal.Body>
    </Modal>
  );
}

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
      snapshot
    );
  }
  await submissionApi.createFileSubmission(SubmissionType.FILE, snapshot);
  onComplete();
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

  return (
    <Button
      loading={isUploading}
      onClick={() => {
        setIsUploading(true);
        uploadFiles({
          files: files as File[],
          onComplete: () => {
            setIsUploading(false);
            onComplete();
          },
          appendToSubmission,
        }).finally(() => {
          setIsUploading(false);
        });
      }}
      variant="outline"
      leftSection={<IconUpload />}
      disabled={!files.length}
    >
      <Trans>Upload</Trans>
    </Button>
  );
}

type SubmissionUploaderProps = {
  appendToSubmission?: SubmissionDto;
};

export function SubmissionUploader(props: SubmissionUploaderProps) {
  const { appendToSubmission } = props;
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [cropFile, setCropFile] = useState<FileWithPath | null>(null);

  const imageFiles = files.filter(
    (file) => file.type.startsWith('image/') && !file.type.includes('gif')
  );

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
      <Stack>
        <Flex gap="md">
          <Dropzone
            flex="5"
            onDrop={(newFiles) => setFiles([...files, ...newFiles])}
            maxSize={100 * 1024 ** 2}
            accept={[
              ...IMAGE_MIME_TYPE,
              ...MS_WORD_MIME_TYPE,
              ...PDF_MIME_TYPE,
              ...TEXT_MIME_TYPES,
              ...VIDEO_MIME_TYPES,
            ]}
          >
            <Group
              justify="center"
              gap="xl"
              mih={200}
              style={{ pointerEvents: 'none' }}
            >
              <Dropzone.Accept>
                <IconUpload
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: 'var(--mantine-color-blue-6)',
                  }}
                  stroke={1.5}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: 'var(--mantine-color-red-6)',
                  }}
                  stroke={1.5}
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: 'var(--mantine-color-dimmed)',
                  }}
                  stroke={1.5}
                />
              </Dropzone.Idle>

              <div>
                <Text size="xl" inline>
                  <Trans>Drag images here or click to select files</Trans>
                  <Text
                    size="sm"
                    c="dimmed"
                    inline
                    mt={7}
                    lineClamp={2}
                    component="span"
                  >
                    {files.length ? files.map((f) => f.name).join(', ') : null}
                  </Text>
                </Text>
              </div>
            </Group>
          </Dropzone>

          {imageFiles.length ? (
            <ScrollArea
              flex="7"
              h={250}
              bg="var(--mantine-color-dark-filled)"
              p="md"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
            >
              <Stack>
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
          ) : null}
        </Flex>
        <UploadButton
          appendToSubmission={appendToSubmission}
          files={files}
          onComplete={() => setFiles([])}
        />
      </Stack>
      {cropFile ? <EditImageModal file={cropFile} onClose={onEdit} /> : null}
    </>
  );
}
