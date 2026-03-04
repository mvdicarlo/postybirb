/* eslint-disable lingui/text-restrictions */
/* eslint-disable lingui/no-unlocalized-strings */
/**
 * DescriptionPreviewPanel - Shows parsed description output per website.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Alert,
    Box,
    CopyButton,
    Group,
    Loader,
    ScrollArea,
    Tabs,
    Text,
    Textarea,
    Tooltip,
    TypographyStylesProvider,
} from '@mantine/core';
import {
    DescriptionType,
    IDescriptionPreviewResult,
    SubmissionId,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import websiteOptionsApi from '../../../../../../../api/website-options.api';
import { useWebsitesMap } from '../../../../../../../stores/entity/website-store';

interface DescriptionPreviewPanelProps {
  /** The submission ID */
  submissionId: SubmissionId;
  /** All website options for this submission */
  options: WebsiteOptionsDto[];
  /** Whether the current option being edited is the default */
  isDefaultEditor: boolean;
  /** The current (non-default) option ID, if applicable */
  currentOptionId?: string;
}

interface PreviewState {
  loading: boolean;
  error?: string;
  result?: IDescriptionPreviewResult;
}

function formatDescriptionType(type: DescriptionType): string {
  switch (type) {
    case DescriptionType.HTML:
      return 'HTML';
    case DescriptionType.MARKDOWN:
      return 'Markdown';
    case DescriptionType.BBCODE:
      return 'BBCode';
    case DescriptionType.PLAINTEXT:
      return 'Plain Text';
    case DescriptionType.CUSTOM:
      return 'Custom';
    default:
      return type;
  }
}

function PreviewContent({ preview }: { preview: PreviewState }) {
  if (preview.loading) {
    return (
      <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader size="sm" />
      </Box>
    );
  }

  if (preview.error) {
    return (
      <Alert color="red" p="xs">
        {preview.error}
      </Alert>
    );
  }

  if (!preview.result) {
    return (
      <Text c="dimmed" size="sm" p="md">
        <Trans>No preview available</Trans>
      </Text>
    );
  }

  const { descriptionType, description } = preview.result;

  return (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed">
          Format: {formatDescriptionType(descriptionType)}
        </Text>
        <CopyButton value={description} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                onClick={copy}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>

      {/* Raw output */}
      <Textarea
        value={description}
        readOnly
        autosize
        minRows={3}
        maxRows={12}
        styles={{
          input: {
            fontFamily: 'monospace',
            fontSize: '12px',
          },
        }}
      />

      {/* HTML rendered preview */}
      {descriptionType === DescriptionType.HTML && description && (
        <Box mt="xs">
          <Text size="xs" c="dimmed" mb={4}>
            Rendered:
          </Text>
          <ScrollArea.Autosize mah={300}>
            <TypographyStylesProvider>
              <Box
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  padding: 'var(--mantine-spacing-xs)',
                  fontSize: '13px',
                }}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </TypographyStylesProvider>
          </ScrollArea.Autosize>
        </Box>
      )}
    </Box>
  );
}

export function DescriptionPreviewPanel({
  submissionId,
  options,
  isDefaultEditor,
  currentOptionId,
}: DescriptionPreviewPanelProps) {
  const websitesMap = useWebsitesMap();
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});

  // For default editor: show all non-default options as tabs (one per website)
  // For website-specific editor: show only the current option
  const previewableOptions = useMemo(() => {
    const candidates = isDefaultEditor
      ? options.filter((o) => !o.isDefault)
      : options.filter((o) => o.id === currentOptionId);
    // Deduplicate by website — keep only the first option per unique website
    const seen = new Set<string>();
    return candidates.filter((o) => {
      const websiteId = o.account?.website ?? o.id;
      if (seen.has(websiteId)) return false;
      seen.add(websiteId);
      return true;
    });
  }, [isDefaultEditor, options, currentOptionId]);

  /** Resolve human-readable website display name for an option */
  const getDisplayName = useCallback(
    (opt: WebsiteOptionsDto) =>
      websitesMap.get(opt.account?.website)?.displayName ??
      opt.account?.website ??
      'Unknown',
    [websitesMap],
  );

  const loadPreview = useCallback(
    async (optionId: string) => {
      setPreviews((prev) => ({
        ...prev,
        [optionId]: { loading: true },
      }));

      try {
        const response = await websiteOptionsApi.previewDescription({
          submissionId,
          websiteOptionId: optionId,
        });
        setPreviews((prev) => ({
          ...prev,
          [optionId]: { loading: false, result: response.body },
        }));
      } catch (err) {
        setPreviews((prev) => ({
          ...prev,
          [optionId]: {
            loading: false,
            error:
              err instanceof Error ? err.message : 'Failed to load preview',
          },
        }));
      }
    },
    [submissionId],
  );

  // Auto-load first tab
  useEffect(() => {
    if (previewableOptions.length > 0) {
      const firstId = previewableOptions[0].id;
      if (!previews[firstId]) {
        loadPreview(firstId);
      }
    }
    // Only run on mount and when previewableOptions changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewableOptions.map((o) => o.id).join(',')]);

  if (previewableOptions.length === 0) {
    return (
      <Alert color="yellow" p="xs" mt="xs">
        <Trans>
          No website accounts configured. Add website accounts to preview
          the description output.
        </Trans>
      </Alert>
    );
  }

  // Single option — no tabs needed
  if (previewableOptions.length === 1) {
    const opt = previewableOptions[0];
    const preview = previews[opt.id] ?? { loading: true };
    return (
      <Box
        mt="xs"
        p="xs"
        style={{
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-sm)',
        }}
      >
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            <Trans>Preview</Trans>: {getDisplayName(opt)}
          </Text>
          <ActionIcon
            size="xs"
            variant="subtle"
            onClick={() => loadPreview(opt.id)}
          >
            <Text size="xs">↻</Text>
          </ActionIcon>
        </Group>
        <PreviewContent preview={preview} />
      </Box>
    );
  }

  // Multiple options — tabbed view
  return (
    <Box
      mt="xs"
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Tabs
        defaultValue={previewableOptions[0].id}
        onChange={(tabId) => {
          if (tabId && !previews[tabId]) {
            loadPreview(tabId);
          }
        }}
      >
        <Tabs.List>
          {previewableOptions.map((opt) => (
            <Tabs.Tab key={opt.id} value={opt.id}>
              {getDisplayName(opt)}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {previewableOptions.map((opt) => {
          const preview = previews[opt.id] ?? { loading: true };
          return (
            <Tabs.Panel key={opt.id} value={opt.id} p="xs">
              <Group justify="flex-end" mb="xs">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => loadPreview(opt.id)}
                >
                  <Text size="xs">↻</Text>
                </ActionIcon>
              </Group>
              <PreviewContent preview={preview} />
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Box>
  );
}
