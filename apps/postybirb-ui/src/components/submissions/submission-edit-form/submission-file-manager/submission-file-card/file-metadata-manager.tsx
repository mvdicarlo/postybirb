/* eslint-disable react/no-unescaped-entities */
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Grid,
  Group,
  NumberInput,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  FileMetadataFields,
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
  SubmissionId,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { filesize } from 'filesize';
import { useState } from 'react';
import submissionApi from '../../../../../api/submission.api';
import { BasicWebsiteSelect } from '../../../../form/website-select/basic-website-select';

// URL validation utility
function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true; // Empty URLs are valid (optional)
  try {
    // eslint-disable-next-line no-new
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

type FileMetadataManagerProps = {
  file: ISubmissionFileDto;
  metadata: FileSubmissionMetadata;
  submissionId: SubmissionId;
};

type FileDetailProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  file: ISubmissionFileDto;
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
        <Text size="xs" fw={500} color="dimmed">
          <Trans>File Name</Trans>
        </Text>
        <Text size="sm" fw={600}>
          {file.fileName}
        </Text>
      </Box>

      <Box>
        <Text size="xs" fw={500} color="dimmed">
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

function updateFileDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  height: number,
  width: number,
) {
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions.default = {
    fileId: file.id,
    height,
    width,
  };
}

function calculateAspectRatio(
  height: number,
  width: number,
  aspect: number,
  order: 'h' | 'w',
) {
  if (order === 'h') {
    const aspectRatio = aspect; // width / height

    const widthT = Math.ceil(height * aspectRatio);
    const heightT = Math.ceil(height);

    return { width: widthT, height: heightT };
  }

  const aspectRatio = aspect; // height / width

  const heightT = Math.ceil(width * aspectRatio);
  const widthT = Math.ceil(width);

  return { width: widthT, height: heightT };
}

function FileDimensions(props: FileDetailProps) {
  const { file, metadata, save } = props;

  const { width: providedWidth, height: providedHeight } =
    metadata.dimensions.default ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);

  return (
    <Box>
      <Group gap="xs" mb={5}>
        <Text size="sm" fw={600}>
          <Trans>Dimensions</Trans>
        </Text>
        <Tooltip
          label={
            <Trans>Adjust dimensions while maintaining aspect ratio</Trans>
          }
          withArrow
        >
          <IconInfoCircle size={14} style={{ opacity: 0.7 }} />
        </Tooltip>
      </Group>
      <Grid>
        <Grid.Col span={6}>
          <NumberInput
            label={<Trans>Height</Trans>}
            value={height}
            max={file.height}
            min={1}
            size="xs"
            step={10}
            onBlur={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                Math.min(Number(event.target.value), file.height),
                width,
                file.width / file.height,
                'h',
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(metadata, file, aspectH, aspectW);
              save();
            }}
            onChange={(value) => setHeight(Number(value) || 1)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label={<Trans>Width</Trans>}
            value={width}
            max={file.width}
            min={1}
            size="xs"
            step={10}
            onBlur={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                height,
                Math.min(Number(event.target.value), file.width),
                file.height / file.width,
                'w',
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(metadata, file, aspectH, aspectW);
              save();
            }}
            onChange={(value) => setWidth(Number(value) || 1)}
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
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

function FileSourceUrls(props: FileDetailProps) {
  const { metadata, save } = props;

  // Create a stable structure with unique IDs for each URL entry
  const [urlEntries, setUrlEntries] = useState<
    Array<{ id: string; value: string; isValid: boolean }>
  >(() => {
    const entries = (metadata.sourceUrls || []).map((url, index) => ({
      id: `url-${Date.now()}-${index}`,
      value: url,
      isValid: isValidUrl(url),
    }));
    // Always have at least one empty entry
    if (entries.length === 0 || entries[entries.length - 1].value !== '') {
      entries.push({
        id: `url-${Date.now()}-${entries.length}`,
        value: '',
        isValid: true,
      });
    }
    return entries;
  });

  const updateUrls = (
    newEntries: Array<{ id: string; value: string; isValid: boolean }>,
    shouldSave = false,
  ) => {
    // Filter out empty URLs and invalid URLs for saving
    const validUrls = newEntries
      .map((entry) => entry.value.trim())
      .filter((url) => url !== '' && isValidUrl(url));

    // Only save if there are actual changes and shouldSave is true
    if (shouldSave) {
      const currentUrls = metadata.sourceUrls || [];
      const urlsChanged = 
        validUrls.length !== currentUrls.length ||
        validUrls.some((url, index) => url !== currentUrls[index]);

      if (urlsChanged) {
        metadata.sourceUrls = validUrls;
        save();
      }
    }

    setUrlEntries(newEntries);
  };

  const addUrl = () => {
    const newEntry = {
      id: `url-${Date.now()}-${urlEntries.length}`,
      value: '',
      isValid: true,
    };
    const newEntries = [...urlEntries, newEntry];
    setUrlEntries(newEntries);
  };

  const removeUrl = (idToRemove: string) => {
    const newEntries = urlEntries.filter((entry) => entry.id !== idToRemove);
    updateUrls(newEntries, true);
  };

  const updateUrl = (id: string, value: string) => {
    const isValid = isValidUrl(value);
    const newEntries = urlEntries.map((entry) =>
      entry.id === id ? { ...entry, value, isValid } : entry,
    );
    setUrlEntries(newEntries);
  };

  const handleUrlBlur = () => {
    // Ensure there's always at least one empty input at the end
    const lastEntry = urlEntries[urlEntries.length - 1];
    const newEntries = [...urlEntries];

    if (!lastEntry || lastEntry.value.trim() !== '') {
      newEntries.push({
        id: `url-${Date.now()}-${urlEntries.length}`,
        value: '',
        isValid: true,
      });
    }

    updateUrls(newEntries, true);
  };

  return (
    <Box mt="md">
      <Group gap="xs" mb={8}>
        <Text size="sm" fw={600}>
          <Trans>Source URLs</Trans>
        </Text>
        <Tooltip label={<Trans>Add source URLs for this file</Trans>} withArrow>
          <IconInfoCircle size={14} style={{ opacity: 0.7 }} />
        </Tooltip>
      </Group>
      <Grid gutter="xs">
        {urlEntries.map((entry) => {
          const isLastEmpty =
            entry === urlEntries[urlEntries.length - 1] && entry.value === '';
          return (
            <Grid.Col span={12} key={entry.id}>
              <Group gap="xs">
                <TextInput
                  size="xs"
                  placeholder="https://example.com/image.jpg"
                  value={entry.value}
                  style={{ flex: 1 }}
                  onChange={(event) => updateUrl(entry.id, event.target.value)}
                  onBlur={handleUrlBlur}
                  error={
                    entry.value.trim() !== '' && !entry.isValid ? (
                      <Trans>Please enter a valid URL</Trans>
                    ) : undefined
                  }
                />
                {!isLastEmpty && (
                  <Tooltip label={<Trans>Remove URL</Trans>}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeUrl(entry.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                {isLastEmpty && (
                  <Tooltip label={<Trans>Add URL</Trans>}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={addUrl}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Grid.Col>
          );
        })}
      </Grid>
    </Box>
  );
}

export function FileMetadataManager(props: FileMetadataManagerProps) {
  const { submissionId, file, metadata } = props;
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
  const detailProps: FileDetailProps = { file, metadata: meta, save };
  return (
    <>
      <FileDetails {...detailProps} />
      <FileMetadata {...detailProps} />
      {fileType === FileType.IMAGE ? <FileDimensions {...detailProps} /> : null}
      {fileType !== FileType.TEXT ? <FileSourceUrls {...detailProps} /> : null}
    </>
  );
}
