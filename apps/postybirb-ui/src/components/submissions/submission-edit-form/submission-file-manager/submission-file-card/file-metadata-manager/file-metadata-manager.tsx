import { Trans } from '@lingui/react/macro';
import { Box, Grid, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  FileType,
  IAccount,
  ISubmissionFileDto,
  SubmissionFileMetadata,
  SubmissionId,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import fileSubmissionApi from '../../../../../../api/file-submission.api';
import { CommonTranslations } from '../../../../../../translations/common-translations';
import { ComponentErrorBoundary } from '../../../../../error-boundary';
import { BasicWebsiteSelect } from '../../../../../form/website-select/basic-website-select';
import { FileDimensions } from './file-dimensions';
import { FileSourceUrls } from './file-source-urls';

type FileMetadataManagerProps = {
  file: ISubmissionFileDto;
  metadata: SubmissionFileMetadata;
  submissionId: SubmissionId;
  accounts: IAccount[];
};

type FileDetailProps = Pick<FileMetadataManagerProps, 'file' | 'accounts'> & {
  // eslint-disable-next-line react/no-unused-prop-types
  metadata: SubmissionFileMetadata;
  // eslint-disable-next-line react/no-unused-prop-types
  save: () => void;
};

function FileMetadata(props: FileDetailProps) {
  const { metadata, save } = props;

  return (
    <Box>
      <Grid gutter="xs">
        <Grid.Col span={12}>
          <BasicWebsiteSelect
            label={<Trans>Skip Accounts</Trans>}
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
  const { file, metadata, accounts } = props;
  const fileType = getFileType(file.fileName);
  const meta = file.metadata;
  const save = () => {
    fileSubmissionApi.updateMetadata(file.id, metadata).catch((e) => {
      notifications.show({
        title: <CommonTranslations.NounUpdateFailed />,
        message: e.message,
        color: 'red',
      });
    });
  };
  const detailProps: FileDetailProps = { file, metadata: meta, accounts, save };
  return (
    <ComponentErrorBoundary>
      <FileMetadata {...detailProps} />
      {fileType === FileType.IMAGE ? <FileDimensions {...detailProps} /> : null}
      {fileType !== FileType.TEXT ? <FileSourceUrls {...detailProps} /> : null}
    </ComponentErrorBoundary>
  );
}
