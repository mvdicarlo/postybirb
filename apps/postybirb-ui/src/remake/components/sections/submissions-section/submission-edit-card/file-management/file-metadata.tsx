/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
/**
 * FileMetadata - Form for editing file metadata (alt text, spoiler, sources, skip accounts, dimensions).
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Grid,
    Group,
    NumberInput,
    Select,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    FileType,
    IAccountDto,
    ISubmissionFileDto,
    ModifiedFileDimension,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconInfoCircle,
    IconPlus,
    IconRestore,
    IconTrash,
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { BasicWebsiteSelect } from '../../../../shared';

interface FileMetadataProps {
  file: ISubmissionFileDto;
  accounts: IAccountDto[];
}

export function FileMetadata({ file, accounts }: FileMetadataProps) {
  const { metadata } = file;
  const fileType = getFileType(file.fileName);

  // Create a save function that updates metadata on the server
  const save = useCallback(() => {
    fileSubmissionApi.updateMetadata(file.id, metadata).catch((error) => {
      notifications.show({
        message:
          // eslint-disable-next-line lingui/no-unlocalized-strings
          error instanceof Error ? error.message : 'Failed to save metadata',
        color: 'red',
      });
    });
  }, [file.id, metadata]);

  return (
    <Box>
      {/* Skip Accounts */}
      <Grid gutter="xs">
        <Grid.Col span={12}>
          <BasicWebsiteSelect
            label={<Trans>Skip Accounts</Trans>}
            size="xs"
            selected={metadata.ignoredWebsites ?? []}
            onSelect={(selectedAccounts) => {
              metadata.ignoredWebsites = selectedAccounts.map((acc) => acc.id);
              save();
            }}
          />
        </Grid.Col>

        {/* Alt Text */}
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

        {/* Spoiler Text */}
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

      {/* Dimensions (for images only) */}
      {fileType === FileType.IMAGE && (
        <FileDimensions file={file} accounts={accounts} save={save} />
      )}

      {/* Source URLs (for non-text files) */}
      {fileType !== FileType.TEXT && (
        <FileSourceUrls metadata={metadata} save={save} />
      )}

      {/* TODO: Add BlockNote rich text editor for TEXT file alt content */}
    </Box>
  );
}

/**
 * FileDimensions - Dimension controls with aspect ratio lock.
 */
interface FileDimensionsProps {
  file: ISubmissionFileDto;
  accounts: IAccountDto[];
  save: () => void;
}

function FileDimensions({ file, accounts, save }: FileDimensionsProps) {
  const { metadata } = file;
  const { width: providedWidth, height: providedHeight } =
    metadata.dimensions?.default ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);
  const aspectRef = useRef(file.width / file.height);

  const original = { h: file.height, w: file.width };
  const scale = Math.round((height / original.h) * 100);

  // Debounced save
  const debouncedSave = useMemo(() => debounce(() => save(), 400), [save]);

  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  const applyDimensions = (nextH: number, nextW: number) => {
    const safeH = nextH || 1;
    const safeW = nextW || 1;
    setHeight(safeH);
    setWidth(safeW);

    // Update metadata
    if (!metadata.dimensions) {
      metadata.dimensions = { default: { height: safeH, width: safeW } };
    } else {
      metadata.dimensions.default = { height: safeH, width: safeW };
    }

    debouncedSave();
  };

  const setHeightLocked = (h: number) => {
    const ratio = aspectRef.current;
    const clampedH = Math.min(h, original.h);
    const newW = Math.min(Math.round(clampedH * ratio), original.w);
    applyDimensions(clampedH || 1, newW || 1);
  };

  const setWidthLocked = (w: number) => {
    const ratio = aspectRef.current;
    const clampedW = Math.min(w, original.w);
    const newH = Math.min(Math.round(clampedW / ratio), original.h);
    applyDimensions(newH || 1, clampedW || 1);
  };

  const reset = () => applyDimensions(original.h, original.w);

  return (
    <Box pt="md">
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap={6}>
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
          <Badge
            size="xs"
            variant="light"
            color={scale === 100 ? 'gray' : 'blue'}
          >
            {scale}%
          </Badge>
        </Group>
        <Tooltip label={<Trans>Reset</Trans>}>
          <ActionIcon size="sm" variant="subtle" onClick={reset}>
            <IconRestore size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group gap="xs" align="end" wrap="nowrap" mb="sm">
        <NumberInput
          label={<Trans>Height</Trans>}
          value={height}
          max={original.h}
          min={1}
          size="xs"
          step={10}
          onChange={(val) => setHeightLocked(Number(val) || 1)}
          styles={{ input: { width: 90 } }}
        />
        <Text px={4} pb={4}>
          ×
        </Text>
        <NumberInput
          label={<Trans>Width</Trans>}
          value={width}
          max={original.w}
          min={1}
          size="xs"
          step={10}
          onChange={(val) => setWidthLocked(Number(val) || 1)}
          styles={{ input: { width: 90 } }}
        />
        <Group gap={4} mb={6}>
          {([100, 75, 50, 25] as const).map((p) => {
            const active = scale === p;
            return (
              <Button
                key={p}
                size="compact-xs"
                variant={active ? 'filled' : 'light'}
                color={active ? 'blue' : 'gray'}
                onClick={() => {
                  const targetH = Math.max(
                    1,
                    Math.round(original.h * (p / 100)),
                  );
                  setHeightLocked(targetH);
                }}
              >
                {p}%
              </Button>
            );
          })}
        </Group>
      </Group>

      {/* Per-account dimensions */}
      <Divider my="xs" variant="dashed" />
      <CustomAccountDimensions
        accounts={accounts}
        file={file}
        metadata={metadata}
        save={save}
      />
    </Box>
  );
}

/**
 * CustomAccountDimensions - Per-account dimension overrides.
 */
interface CustomAccountDimensionsProps {
  accounts: IAccountDto[];
  file: ISubmissionFileDto;
  metadata: ISubmissionFileDto['metadata'];
  save: () => void;
}

function CustomAccountDimensions({
  accounts,
  file,
  metadata,
  save,
}: CustomAccountDimensionsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const customDimensions = Object.entries(metadata.dimensions ?? {}).filter(
    ([key]) => key !== 'default',
  ) as [string, ModifiedFileDimension][];

  const availableAccounts = accounts.filter(
    (acc) => !customDimensions.some(([key]) => key === acc.id),
  );

  const addAccountDimension = () => {
    if (!selectedAccountId) return;

    if (!metadata.dimensions) {
      metadata.dimensions = {
        default: { height: file.height, width: file.width },
      };
    }
    metadata.dimensions[selectedAccountId] = {
      height: file.height,
      width: file.width,
    };
    setSelectedAccountId(null);
    save();
  };

  const removeAccountDimension = (accountId: string) => {
    if (metadata.dimensions) {
      delete metadata.dimensions[accountId];
      save();
    }
  };

  const updateAccountDimension = (
    accountId: string,
    height: number,
    width: number,
  ) => {
    if (metadata.dimensions) {
      metadata.dimensions[accountId] = { height, width };
      save();
    }
  };

  // Build select options with [WebsiteName] AccountName format
  const accountOptions = availableAccounts.map((acc) => ({
    value: acc.id,
    label: `[${acc.websiteInfo.websiteDisplayName}] ${acc.name}`,
  }));

  return (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text size="xs" fw={500}>
          <Trans>Per-Account Dimensions</Trans>
        </Text>
      </Group>

      {/* Account selector for adding new dimension override */}
      {availableAccounts.length > 0 && (
        <Group gap="xs" mb="xs" wrap="nowrap">
          <Select
            size="xs"
            data={accountOptions}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            searchable
            clearable
            style={{ flex: 1 }}
          />
          <ActionIcon
            size="sm"
            variant="light"
            disabled={!selectedAccountId}
            onClick={addAccountDimension}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Group>
      )}

      {customDimensions.length === 0 ? (
        <Text size="xs" c="dimmed">
          <Trans>No custom dimensions set</Trans>
        </Text>
      ) : (
        customDimensions.map(([accountId, dims]) => {
          const account = accounts.find((acc) => acc.id === accountId);
          if (!account) return null;

          return (
            <Group key={accountId} gap="xs" mb="xs" wrap="nowrap">
              <Badge size="xs" variant="light" color="gray">
                {account.websiteInfo.websiteDisplayName}
              </Badge>
              <Text size="xs" style={{ minWidth: 80 }} truncate>
                {account.name}
              </Text>
              <NumberInput
                value={dims.height}
                min={1}
                max={file.height}
                size="xs"
                styles={{ input: { width: 60 } }}
                onChange={(val) =>
                  updateAccountDimension(
                    accountId,
                    Number(val) || 1,
                    dims.width,
                  )
                }
              />
              <Text size="xs">×</Text>
              <NumberInput
                value={dims.width}
                min={1}
                max={file.width}
                size="xs"
                styles={{ input: { width: 60 } }}
                onChange={(val) =>
                  updateAccountDimension(
                    accountId,
                    dims.height,
                    Number(val) || 1,
                  )
                }
              />
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => removeAccountDimension(accountId)}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Group>
          );
        })
      )}
    </Box>
  );
}

/**
 * FileSourceUrls - List of source URLs for the file.
 */
interface FileSourceUrlsProps {
  metadata: ISubmissionFileDto['metadata'];
  save: () => void;
}

function FileSourceUrls({ metadata, save }: FileSourceUrlsProps) {
  const [urls, setUrls] = useState<string[]>(() => [
    ...(metadata.sourceUrls || []),
    '', // Always have one empty slot
  ]);

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;

    // Add empty slot if last one is filled
    if (index === newUrls.length - 1 && value.trim()) {
      newUrls.push('');
    }

    setUrls(newUrls);
  };

  const commitUrls = () => {
    const validUrls = urls.filter(
      (url) => url.trim() && isValidUrl(url.trim()),
    );
    metadata.sourceUrls = validUrls;
    save();
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    if (newUrls.length === 0 || newUrls[newUrls.length - 1] !== '') {
      newUrls.push('');
    }
    setUrls(newUrls);

    // Commit immediately on remove
    const validUrls = newUrls.filter(
      (url) => url.trim() && isValidUrl(url.trim()),
    );
    metadata.sourceUrls = validUrls;
    save();
  };

  return (
    <Box pt="md">
      <Text size="sm" fw={600} mb="xs">
        <Trans>Source URLs</Trans>
      </Text>
      {urls.map((url, index) => (
        <Group key={index} gap="xs" mb="xs">
          <TextInput
            placeholder="https://..."
            value={url}
            size="xs"
            style={{ flex: 1 }}
            error={url.trim() && !isValidUrl(url.trim())}
            onChange={(e) => updateUrl(index, e.target.value)}
            onBlur={commitUrls}
          />
          {url.trim() && (
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => removeUrl(index)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      ))}
    </Box>
  );
}

// URL validation helper
function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;

  try {
    const parsed = new URL(url.trim());
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      parsed.hostname.includes('.')
    );
  } catch {
    return false;
  }
}
