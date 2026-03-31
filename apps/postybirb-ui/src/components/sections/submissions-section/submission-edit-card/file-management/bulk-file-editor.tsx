/* eslint-disable no-param-reassign */
/**
 * BulkFileEditor - Inline panel for applying metadata to multiple files at once.
 * Supports: Skip Accounts (overwrite), Source URLs (append), Dimension scale % (default dims).
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Button,
    Divider,
    Group,
    MultiSelect,
    NumberInput,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    AccountId,
    EntityId,
    FileType,
    ISubmissionFileDto,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconTrash } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import {
    showErrorWithContext,
    showSuccessNotification,
} from '../../../../../utils/notifications';
import { BasicWebsiteSelect } from '../../../../shared';

interface BulkFileEditorProps {
  files: ISubmissionFileDto[];
}

export function BulkFileEditor({ files }: BulkFileEditorProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<EntityId[]>([]);
  const [ignoredWebsites, setIgnoredWebsites] = useState<AccountId[]>([]);
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [scalePercent, setScalePercent] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const hasImages = files.some(
    (f) => getFileType(f.fileName) === FileType.IMAGE,
  );

  const fileOptions = useMemo(
    () =>
      files.map((f) => ({
        value: f.id,
        label: f.fileName,
      })),
    [files],
  );

  const selectAll = () => setSelectedFileIds(files.map((f) => f.id));

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...sourceUrls];
    newUrls[index] = value;
    if (index === newUrls.length - 1 && value.trim()) {
      newUrls.push('');
    }
    setSourceUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    const newUrls = sourceUrls.filter((_, i) => i !== index);
    if (newUrls.length === 0 || newUrls[newUrls.length - 1] !== '') {
      newUrls.push('');
    }
    setSourceUrls(newUrls);
  };

  const getValidUrls = useCallback(
    (): string[] =>
      sourceUrls.filter((url) => {
        const trimmed = url.trim();
        if (!trimmed) return false;
        try {
          const parsed = new URL(trimmed);
          return (
            ['http:', 'https:'].includes(parsed.protocol) &&
            parsed.hostname.includes('.')
          );
        } catch {
          return false;
        }
      }),
    [sourceUrls],
  );

  const hasChanges =
    ignoredWebsites.length > 0 ||
    getValidUrls().length > 0 ||
    scalePercent !== null;

  const canApply = selectedFileIds.length > 0 && hasChanges;

  const handleApply = async () => {
    if (!canApply) return;

    setIsApplying(true);
    const validUrls = getValidUrls();

    try {
      const selectedFiles = files.filter((f) =>
        selectedFileIds.includes(f.id),
      );

      await Promise.all(
        selectedFiles.map((file) => {
          const updatedMetadata = { ...file.metadata };

          // Skip Accounts — overwrite
          if (ignoredWebsites.length > 0) {
            updatedMetadata.ignoredWebsites = [...ignoredWebsites];
          }

          // Source URLs — append + deduplicate
          if (validUrls.length > 0) {
            const existing = updatedMetadata.sourceUrls ?? [];
            const merged = [...existing, ...validUrls];
            updatedMetadata.sourceUrls = [...new Set(merged)];
          }

          // Dimensions — percentage of each file's original size (default only)
          if (
            scalePercent !== null &&
            getFileType(file.fileName) === FileType.IMAGE &&
            file.width > 0 &&
            file.height > 0
          ) {
            const newHeight = Math.max(
              1,
              Math.round(file.height * (scalePercent / 100)),
            );
            const newWidth = Math.max(
              1,
              Math.round(file.width * (scalePercent / 100)),
            );

            if (!updatedMetadata.dimensions) {
              updatedMetadata.dimensions = {};
            }
            updatedMetadata.dimensions.default = {
              height: newHeight,
              width: newWidth,
            };
          }

          return fileSubmissionApi.updateMetadata(file.id, updatedMetadata);
        }),
      );

      showSuccessNotification(
        <Trans>Applied settings to {selectedFiles.length} file(s)</Trans>,
      );

      // Reset form
      setIgnoredWebsites([]);
      setSourceUrls(['']);
      setScalePercent(null);
    } catch (error) {
      showErrorWithContext(
        error,
        <Trans>Failed to apply bulk settings</Trans>,
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Box p="md" pt="xs">
      <Stack gap="sm">
        {/* File selector */}
        <Group gap="xs" align="end">
          <Box style={{ flex: 1 }}>
            <MultiSelect
              size="xs"
              label={<Trans>Apply to files</Trans>}
              data={fileOptions}
              value={selectedFileIds}
              onChange={setSelectedFileIds}
              searchable
              clearable
            />
          </Box>
          <Button size="xs" variant="light" color="gray" onClick={selectAll}>
            <Trans>Select All</Trans>
          </Button>
        </Group>

        <Divider variant="dashed" />

        {/* Skip Accounts */}
        <BasicWebsiteSelect
          label={<Trans>Skip Accounts</Trans>}
          size="xs"
          selected={ignoredWebsites}
          onSelect={(selectedAccounts) => {
            setIgnoredWebsites(selectedAccounts.map((acc) => acc.id));
          }}
        />

        {/* Source URLs */}
        <Box>
          <Text size="xs" fw={500} mb={4}>
            <Trans>Source URLs (append)</Trans>
          </Text>
          {sourceUrls.map((url, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <Group key={index} gap="xs" mb={4}>
              <TextInput
                placeholder="https://..."
                value={url}
                size="xs"
                style={{ flex: 1 }}
                onChange={(e) => updateUrl(index, e.target.value)}
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

        {/* Dimension scale % — only for image submissions */}
        {hasImages && (
          <Box>
            <Text size="xs" fw={500} mb={4}>
              <Trans>Dimension Scale</Trans>
            </Text>
            <Group gap="xs" align="center">
              <NumberInput
                size="xs"
                value={scalePercent ?? ''}
                min={1}
                max={100}
                step={5}
                suffix="%"
                placeholder="%"
                onChange={(val) =>
                  setScalePercent(val === '' ? null : Number(val))
                }
                styles={{ input: { width: 80 } }}
              />
              {([100, 75, 50, 25] as const).map((p) => (
                <Tooltip key={p} label={`${p}%`}>
                  <Button
                    size="compact-xs"
                    variant={scalePercent === p ? 'filled' : 'light'}
                    color={scalePercent === p ? 'blue' : 'gray'}
                    onClick={() => setScalePercent(p)}
                  >
                    {p}%
                  </Button>
                </Tooltip>
              ))}
            </Group>
          </Box>
        )}

        <Button
          size="xs"
          onClick={handleApply}
          disabled={!canApply}
          loading={isApplying}
          fullWidth
        >
          <Trans>Apply to Selected Files</Trans>
        </Button>
      </Stack>
    </Box>
  );
}
