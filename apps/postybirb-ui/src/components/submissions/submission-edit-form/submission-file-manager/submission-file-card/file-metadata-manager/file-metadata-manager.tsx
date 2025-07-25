/* eslint-disable react/no-unescaped-entities */
import { Trans } from '@lingui/macro';
import { Badge, Box, Grid, Group, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  FileMetadataFields,
  FileSubmissionMetadata,
  FileType,
  IAccount,
  ISubmissionFileDto,
  SubmissionId,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { filesize } from 'filesize';
import submissionApi from '../../../../../../api/submission.api';
import { BasicWebsiteSelect } from '../../../../../form/website-select/basic-website-select';
import { FileDimensions } from './file-dimensions';
import { FileSourceUrls } from './file-source-urls';

type FileMetadataManagerProps = {
  file: ISubmissionFileDto;
  metadata: FileSubmissionMetadata;
  submissionId: SubmissionId;
  accounts: IAccount[];
};

type FileDetailProps = Pick<FileMetadataManagerProps, 'file' | 'accounts'> & {
  // eslint-disable-next-line react/no-unused-prop-types
  metadata: FileMetadataFields;
  // eslint-disable-next-line react/no-unused-prop-types
  save: () => void;
};

function FileDetails(props: FileDetailProps) {
  const { file } = props;
  return (
    <Group gap="lg">
      <Box>
        <Text size="xs" fw={500} c="dimmed">
          <Trans>File Name</Trans>
        </Text>
        <Text size="sm" fw={600}>
          {file.fileName}
        </Text>
      </Box>

      <Box>
        <Text size="xs" fw={500} c="dimmed">
          <Trans context="submission.file-size">Size</Trans>
        </Text>
        <Text size="sm" fw={600}>
          {filesize(file.size, { base: 2 }) as string}
        </Text>
      </Box>

      <Box>
        <Text size="xs" fw={500} color="dimmed">
          <Trans>Type</Trans>
        </Text>
        <Badge
          variant="outline"
          c="dimmed"
          color={getFileTypeColor(getFileType(file.fileName))}
        >
          {getFileType(file.fileName)}
        </Badge>
      </Box>
    </Group>
  );
}

function getFileTypeColor(fileType: FileType): string {
  switch (fileType) {
    case FileType.IMAGE:
      return 'blue';
    case FileType.TEXT:
      return 'green';
    case FileType.VIDEO:
      return 'purple';
    case FileType.AUDIO:
      return 'orange';
    default:
      return 'gray';
  }
}

function FileMetadata(props: FileDetailProps) {
  const { metadata, save } = props;

  return (
    <Box mt="md">
      <Text size="sm" fw={600} mb={8}>
        <Trans>Posting Options</Trans>
      </Text>
      <Grid gutter="xs">
        <Grid.Col span={12}>
          <BasicWebsiteSelect
            label={<Trans>Don't post to</Trans>}
            size="xs"
            selected={metadata.ignoredWebsites ?? []}
            onSelect={(accounts) => {
              metadata.ignoredWebsites = accounts.map((account) => account.id);
              save();
            }}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            label={<Trans>Alt Text</Trans>}
            defaultValue={metadata.altText}
            size="xs"
            onBlur={(event) => {
              metadata.altText = event.target.value.trim();
              save();
            }}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            label={<Trans>Spoiler Text</Trans>}
            defaultValue={metadata.spoilerText}
            size="xs"
            onBlur={(event) => {
              metadata.spoilerText = event.target.value.trim();
              save();
            }}
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
}

export function FileMetadataManager(props: FileMetadataManagerProps) {
  const { submissionId, file, metadata, accounts } = props;
  const fileType = getFileType(file.fileName);
  const meta = metadata.fileMetadata[file.id];
  const save = () => {
    submissionApi.update(submissionId, { metadata }).catch((e) => {
      notifications.show({
        title: <Trans>Failed to save file metadata</Trans>,
        message: e.message,
        color: 'red',
      });
    });
  };
  const detailProps: FileDetailProps = { file, metadata: meta, accounts, save };
  return (
    <>
      <FileDetails {...detailProps} />
      <FileMetadata {...detailProps} />
      {fileType === FileType.IMAGE ? <FileDimensions {...detailProps} /> : null}
      {fileType !== FileType.TEXT ? <FileSourceUrls {...detailProps} /> : null}
    </>
  );
}
