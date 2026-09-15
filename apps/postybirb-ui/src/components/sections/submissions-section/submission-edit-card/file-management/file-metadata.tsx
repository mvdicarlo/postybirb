/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
/**
 * FileMetadata - Form for editing file metadata (alt text, spoiler, sources, skip accounts, dimensions).
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    AccountId,
    FileType,
    IAccountDto,
    ISubmissionFileDto,
    ModifiedFileDimension,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconInfoCircle,
    IconLink,
    IconPlus,
    IconRestore,
    IconTrash,
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { useWebsitesMap } from '../../../../../stores/entity/website-store';
import { showErrorWithContext } from '../../../../../utils/notifications';
import { BasicWebsiteSelect } from '../../../../shared';
import { FileAltTextEditor } from './file-alt-text-editor';

interface FileMetadataProps {
  file: ISubmissionFileDto;
  accounts: IAccountDto[];
}

export function FileMetadata({ file, accounts }: FileMetadataProps) {
  const { metadata } = file;
  const fileType = getFileType(file.fileName);
  const [ignoredWebsites, setIgnoredWebsites] = useState<AccountId[]>(
    metadata.ignoredWebsites ?? [],
  );
  const [altText, setAltText] = useState(metadata.altText ?? '');
  const [spoilerText, setSpoilerText] = useState(metadata.spoilerText ?? '');
  const focusedTextField = useRef<'altText' | 'spoilerText' | null>(null);

  useEffect(() => {
    if (focusedTextField.current !== 'altText') {
      setAltText(metadata.altText ?? '');
    }
  }, [metadata.altText]);

  useEffect(() => {
    if (focusedTextField.current !== 'spoilerText') {
      setSpoilerText(metadata.spoilerText ?? '');
    }
  }, [metadata.spoilerText]);

  // Sync local state when file prop changes (e.g. after bulk edit)
  useEffect(() => {
    setIgnoredWebsites(metadata.ignoredWebsites ?? []);
  }, [metadata.ignoredWebsites]);

  // Create a save function that updates metadata on the server
  const save = useCallback(() => {
    fileSubmissionApi.updateMetadata(file.id, metadata).catch((error) => {
      showErrorWithContext(error, <Trans>Failed to save metadata</Trans>);
    });
  }, [file.id, metadata]);

  return (
    <Stack gap="md">
      <Textarea
        label={<Trans>Alt Text</Trans>}
        value={altText}
        size="sm"
        autosize
        minRows={3}
        maxRows={8}
        onFocus={() => {
          focusedTextField.current = 'altText';
        }}
        onChange={(event) => setAltText(event.currentTarget.value)}
        onBlur={(event) => {
          focusedTextField.current = null;
          metadata.altText = event.target.value.trim();
          setAltText(metadata.altText);
          save();
        }}
      />
      <div className="postybirb-file-secondary-fields">
        <TextInput
          label={<Trans>Spoiler Text</Trans>}
          value={spoilerText}
          size="sm"
          onFocus={() => {
            focusedTextField.current = 'spoilerText';
          }}
          onChange={(event) => setSpoilerText(event.currentTarget.value)}
          onBlur={(event) => {
            focusedTextField.current = null;
            metadata.spoilerText = event.target.value.trim();
            setSpoilerText(metadata.spoilerText);
            save();
          }}
        />
        <BasicWebsiteSelect
          label={<Trans>Skip Accounts</Trans>}
          size="sm"
          selected={ignoredWebsites}
          onSelect={(selectedAccounts) => {
            const ids = selectedAccounts.map((acc) => acc.id);
            setIgnoredWebsites(ids);
            metadata.ignoredWebsites = ids;
            save();
          }}
        />
      </div>

      {fileType !== FileType.TEXT && (
        <FileSourceUrls metadata={metadata} save={save} />
      )}

      {fileType === FileType.IMAGE && (
        <>
          <Divider />
          <FileDimensions file={file} accounts={accounts} save={save} />
        </>
      )}

      {fileType === FileType.TEXT && (
        <>
          <Divider />
          <FileAltTextEditor file={file} />
        </>
      )}
    </Stack>
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

  // Sync local state when file dimensions change (e.g. after bulk edit)
  useEffect(() => {
    const { width: pw, height: ph } = metadata.dimensions?.default ?? file;
    setHeight(ph || 1);
    setWidth(pw || 1);
  }, [file, metadata.dimensions]);

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
    <Box>
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
          <ActionIcon variant="subtle" onClick={reset} aria-label={t`Reset`}>
            <IconRestore size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group gap="sm" align="end" mb="md">
        <div className="postybirb-file-dimension-inputs">
          <NumberInput
            label={<Trans>Width</Trans>}
            value={width}
            max={original.w}
            min={1}
            size="sm"
            step={10}
            onChange={(val) => setWidthLocked(Number(val) || 1)}
          />
          <NumberInput
            label={<Trans>Height</Trans>}
            value={height}
            max={original.h}
            min={1}
            size="sm"
            step={10}
            onChange={(val) => setHeightLocked(Number(val) || 1)}
          />
        </div>
        <SegmentedControl
          size="xs"
          value={String(scale)}
          aria-label={t`Dimensions`}
          data={[100, 75, 50, 25].map((percentage) => ({
            value: String(percentage),
            label: `${percentage}%`,
          }))}
          onChange={(percentage) => {
            setHeightLocked(
              Math.max(1, Math.round(original.h * (Number(percentage) / 100))),
            );
          }}
        />
      </Group>

      {/* Per-account dimensions */}
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
  const websitesMap = useWebsitesMap();
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
    label: `[${websitesMap.get(acc.website)?.displayName ?? acc.website}] ${acc.name}`,
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
            size="sm"
            aria-label={t`Per-Account Dimensions`}
            data={accountOptions}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            searchable
            clearable
            style={{ flex: 1, minWidth: 0 }}
          />
          <Tooltip label={<Trans>Add account</Trans>}>
            <ActionIcon
              variant="light"
              disabled={!selectedAccountId}
              onClick={addAccountDimension}
              aria-label={t`Add account`}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
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
            <Box key={accountId} mt="sm">
              <Group gap="xs" mb={4}>
                <Badge size="xs" variant="light" color="gray">
                  {websitesMap.get(account.website)?.displayName ??
                    account.website}
                </Badge>
                <Text size="xs" className="postybirb-file-name">
                  {account.name}
                </Text>
              </Group>
              <Group gap="xs" wrap="nowrap" align="end">
                <div className="postybirb-file-dimension-inputs">
                  <NumberInput
                    label={<Trans>Width</Trans>}
                    value={dims.width}
                    min={1}
                    max={file.width}
                    size="sm"
                    onChange={(val) =>
                      updateAccountDimension(
                        accountId,
                        dims.height,
                        Number(val) || 1,
                      )
                    }
                  />
                  <NumberInput
                    label={<Trans>Height</Trans>}
                    value={dims.height}
                    min={1}
                    max={file.height}
                    size="sm"
                    onChange={(val) =>
                      updateAccountDimension(
                        accountId,
                        Number(val) || 1,
                        dims.width,
                      )
                    }
                  />
                </div>
                <Tooltip label={<Trans>Delete</Trans>}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => removeAccountDimension(accountId)}
                    aria-label={t`Delete`}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Box>
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

  // Sync local state when source URLs change (e.g. after bulk edit)
  useEffect(() => {
    setUrls([...(metadata.sourceUrls || []), '']);
  }, [metadata.sourceUrls]);

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
    <Stack gap="xs">
      {urls.map((url, index) => (
        <Group key={index} gap="xs" wrap="nowrap" align="end">
          <TextInput
            label={index === 0 ? <Trans>Source URLs</Trans> : undefined}
            aria-label={t`Source URLs`}
            placeholder="https://..."
            leftSection={<IconLink size={16} />}
            value={url}
            size="sm"
            style={{ flex: 1, minWidth: 0 }}
            error={url.trim() && !isValidUrl(url.trim())}
            onChange={(e) => updateUrl(index, e.target.value)}
            onBlur={commitUrls}
          />
          {url.trim() && (
            <Tooltip label={<Trans>Delete</Trans>}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => removeUrl(index)}
                aria-label={t`Delete`}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
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
