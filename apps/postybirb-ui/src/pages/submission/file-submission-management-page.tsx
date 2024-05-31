import {
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Divider,
  Flex,
  Group,
  Image,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Space,
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
import { SubmissionType } from '@postybirb/types';
import {
  IconFile,
  IconPhoto,
  IconPhotoEdit,
  IconTemplate,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { PageHeader } from '../../components/page-header/page-header';
import { FileIcon } from '../../components/shared/icons/Icons';
import Uploader from '../../components/shared/uploader/uploader';
import SubmissionTemplateManagementView from '../../components/submission-templates/submission-template-management-view/submission-template-management-view';
import DirectoryWatchersTable from '../../components/submissions/directory-watchers-table/directory-watchers-table';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

const TEXT_MIME_TYPES = [
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
}: {
  file: FileWithPath;
  onEdit: (file: FileWithPath) => void;
}) {
  const imageUrl = URL.createObjectURL(file);
  const height = '75px';
  const width = '75px';

  return (
    <Paper shadow="md">
      <Tooltip label={file.name} position="top" withArrow>
        <Image
          src={imageUrl}
          onLoad={() => URL.revokeObjectURL(imageUrl)}
          alt={file.name}
          height={height}
          width={width}
        />
      </Tooltip>
      <Divider mb="4" />
      <Group mx="xl" grow>
        <Tooltip label={<Trans>Crop</Trans>} position="top" withArrow>
          <ActionIcon variant="subtle" onClick={() => onEdit(file)}>
            <IconPhotoEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={<Trans>Delete</Trans>} position="top" withArrow>
          <ActionIcon variant="subtle" c="red">
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}

const VIDEO_MIME_TYPES = ['video/mp4', 'video/x-m4v', 'video/*'];

function FileUploadSection() {
  const [files, setFiles] = useState<FileWithPath[]>([]);

  const imageFiles = files.filter(
    (file) => file.type.startsWith('image/') && !file.type.includes('gif')
  );

  return (
    <Box>
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
            mih={220}
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
                <Text size="sm" c="dimmed" inline mt={7} lineClamp={2}>
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
            <SimpleGrid flex="7" cols={{ base: 1, sm: 4 }}>
              {imageFiles.map((file) => (
                <Preview file={file} key={file.name} />
              ))}
            </SimpleGrid>
          </ScrollArea>
        ) : null}
      </Flex>
    </Box>
  );
}

export function FileSubmissionManagementPage2() {
  const { state, isLoading } = useStore(SubmissionStore);
  const [activeTab, setActiveTab] = useState<string>('submissions');
  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <PageHeader
        icon={<IconFile />}
        title={<Trans>File Submissions</Trans>}
        tabs={[
          {
            label: <Trans>Submissions</Trans>,
            key: 'submissions',
            icon: <IconFile />,
          },
          {
            label: <Trans>Templates</Trans>,
            key: 'templates',
            icon: <IconTemplate />,
          },
        ]}
        onTabChange={setActiveTab}
      />
      <Space h="md" />
      <Box>
        <FileUploadSection />
      </Box>
    </>
  );
}

export default function FileSubmissionManagementPage() {
  const { euiTheme } = useEuiTheme();
  const { state, isLoading } = useStore(SubmissionStore);
  const [tab, setTab] = useState<'submissions' | 'templates'>('submissions');
  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  const display =
    tab === 'submissions' ? (
      <>
        <Uploader endpointPath="api/submission" />
        <EuiSpacer />
        <DirectoryWatchersTable />
        <EuiSpacer />
        {isLoading ? (
          <EuiProgress size="xs" />
        ) : (
          <SubmissionTable submissions={fileSubmissions} />
        )}
      </>
    ) : (
      <SubmissionTemplateManagementView type={SubmissionType.FILE} />
    );

  return (
    <>
      <EuiPageHeader
        css={{ background: euiTheme.colors.body }}
        bottomBorder
        iconType={FileIcon.Header}
        pageTitle={<Trans>File Submissions</Trans>}
        tabs={[
          {
            label: <Trans>Submissions</Trans>,
            isSelected: tab === 'submissions',
            onClick: () => {
              setTab('submissions');
            },
          },
          {
            label: <Trans>Templates</Trans>,
            isSelected: tab === 'templates',
            onClick: () => {
              setTab('templates');
            },
          },
        ]}
      />
      <EuiSpacer />
      {display}
    </>
  );
}
