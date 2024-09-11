import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Flex,
  Group,
  Image,
  Paper,
  Popover,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
  SubmissionId,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconCrop,
  IconFileText,
  IconFileUpload,
  IconTrash,
} from '@tabler/icons-react';
import fileSubmissionApi from '../../../../api/file-submission.api';
import { defaultTargetProvider } from '../../../../transports/http-client';
import { SubmissionFileMetadataManager } from './submission-file-metadata-manager';

export const DRAGGABLE_SUBMISSION_FILE_CLASS_NAME = 'sortable-file';

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
      return <IconFileText style={{ height: '100px', width: '100px' }} />;
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
// TODO - Implement file updates, also allow for re-crop of thumbnail
export function SubmissionFileCard({
  file,
  draggable,
  metadata,
  totalFiles,
  submissionId,
}: {
  submissionId: SubmissionId;
  file: ISubmissionFileDto;
  draggable: boolean;
  metadata: FileSubmissionMetadata;
  totalFiles: number;
}) {
  const fileType = getFileType(file.fileName);
  return (
    <Paper
      key={file.id}
      p="sm"
      style={{
        borderRadius: 4,
        cursor: draggable ? 'grab' : undefined,
      }}
      className={DRAGGABLE_SUBMISSION_FILE_CLASS_NAME}
    >
      <Flex gap="xl" key="card-file-previewer">
        <Group gap="sm" key="file-previews">
          <Box ta="center" key="primary">
            <strong>
              <Trans comment="Main file data">Primary</Trans>
            </strong>
            <CardImageProvider {...file} />
            <Group justify="center" mt="4">
              <FileButton onChange={console.log}>
                {(props) => (
                  <Tooltip label={<Trans>Update file</Trans>}>
                    <ActionIcon {...props} variant="subtle">
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
                  <ActionIcon variant="subtle">
                    <IconCrop />
                  </ActionIcon>
                </Tooltip>
              ) : null}
              <FileButton onChange={console.log}>
                {(props) => (
                  <Tooltip label={<Trans>Upload new thumbnail</Trans>}>
                    <ActionIcon {...props} variant="subtle">
                      <IconFileUpload />
                    </ActionIcon>
                  </Tooltip>
                )}
              </FileButton>
            </Group>
          </Box>
        </Group>
        <Box flex={10}>
          <SubmissionFileMetadataManager file={file} metadata={metadata} />
        </Box>
        <Box flex={0}>
          <Popover withArrow>
            <Popover.Target>
              <ActionIcon
                disabled={totalFiles === 1}
                variant="subtle"
                style={{ verticalAlign: 'center' }}
                h="100%"
                c="red"
              >
                <IconTrash />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Text c="orange" size="lg">
                <Trans>
                  Are you sure you want to delete this? This action cannot be
                  undone.
                </Trans>
              </Text>
              <Box ta="center" mt="sm">
                <Button
                  disabled={totalFiles === 1}
                  variant="light"
                  color="red"
                  leftSection={<IconTrash />}
                  onClick={() => {
                    fileSubmissionApi.removeFile(submissionId, file.id, 'file');
                  }}
                >
                  <Trans>Delete</Trans>
                </Button>
              </Box>
            </Popover.Dropdown>
          </Popover>
        </Box>
      </Flex>
    </Paper>
  );
}
