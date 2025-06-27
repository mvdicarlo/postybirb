import { Trans } from '@lingui/macro';
import {
    ActionIcon,
    Box,
    Grid,
    Group,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { FileMetadataFields } from '@postybirb/types';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

type FileDetailProps = {
  metadata: FileMetadataFields;
  save: () => void;
};

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

export function FileSourceUrls(props: FileDetailProps) {
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
                      c="red"
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
                      c="blue"
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
