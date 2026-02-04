/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Group,
    Popover,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
    IconChevronDown,
    IconSearch,
    IconWorld,
    IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWebsites } from '../../../../stores';

export interface WebsiteOnlySelectorProps {
  /** Comma-separated list of selected website IDs */
  only: string;
  /** Callback when the selection changes */
  onOnlyChange: (newOnly: string) => void;
}

/**
 * Reusable component for selecting which websites a shortcut applies to.
 * Renders as a badge with a popover for website selection.
 */
export function WebsiteOnlySelector({
  only,
  onOnlyChange,
}: WebsiteOnlySelectorProps) {
  const websites = useWebsites();

  // Popover state management for website selection
  const [opened, { close, toggle }] = useDisclosure(false);

  // Search state with debouncing for website filter
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  // Local state for selected website IDs
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>(() =>
    only ? only.split(',').filter(Boolean) : []
  );

  // Sync local website selection state when props change
  useEffect(() => {
    const propsIds = only ? only.split(',').filter(Boolean) : [];
    setSelectedWebsiteIds(propsIds);
  }, [only]);

  // Available website options
  const websiteOptions = useMemo(
    () => websites.map((w) => ({ value: w.id, label: w.displayName })),
    [websites]
  );

  // Filtered website options based on search
  const filteredWebsiteOptions = useMemo(() => {
    if (!debouncedSearchTerm) return websiteOptions;
    return websiteOptions.filter((option) =>
      option.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [websiteOptions, debouncedSearchTerm]);

  // Update website selection
  const updateWebsiteSelection = useCallback(
    (newOnlyValue: string) => {
      const newIds = newOnlyValue
        ? newOnlyValue.split(',').filter(Boolean)
        : [];
      setSelectedWebsiteIds(newIds);
      onOnlyChange(newOnlyValue);
    },
    [onOnlyChange]
  );

  // Handle individual website toggle
  const handleWebsiteToggle = useCallback(
    (websiteId: string) => {
      const newSelected = selectedWebsiteIds.includes(websiteId)
        ? selectedWebsiteIds.filter((id) => id !== websiteId)
        : [...selectedWebsiteIds, websiteId];
      updateWebsiteSelection(newSelected.join(','));
    },
    [selectedWebsiteIds, updateWebsiteSelection]
  );

  // Handle select all / deselect all
  const handleSelectAll = useCallback(() => {
    const allIds = websiteOptions.map((opt) => opt.value);
    const isAllSelected = selectedWebsiteIds.length === allIds.length;
    updateWebsiteSelection(isAllSelected ? '' : allIds.join(','));
  }, [websiteOptions, selectedWebsiteIds, updateWebsiteSelection]);

  // Display text for selected websites
  const selectedDisplayText = useMemo(() => {
    if (selectedWebsiteIds.length === 0) {
      return <Trans>All Websites</Trans>;
    }

    if (selectedWebsiteIds.length === 1) {
      const website = websites.find((w) => w.id === selectedWebsiteIds[0]);
      return website?.displayName || <Trans>Unknown</Trans>;
    }

    const names = selectedWebsiteIds
      .map((id) => websites.find((w) => w.id === id)?.displayName)
      .filter(Boolean)
      .slice(0, 3);
    if (selectedWebsiteIds.length <= 3) {
      return names.join(', ');
    }

    return `${names.join(', ')} + ${selectedWebsiteIds.length - 3}`;
  }, [selectedWebsiteIds, websites]);

  // Color logic for the website badge
  const badgeColor = useMemo(() => {
    if (selectedWebsiteIds.length === 0) return 'gray';
    if (selectedWebsiteIds.length === websites.length) return 'green';
    return 'blue';
  }, [selectedWebsiteIds.length, websites.length]);

  return (
    <Popover
      opened={opened}
      onChange={(isOpen) => {
        if (!isOpen) close();
      }}
      position="bottom-start"
      width={300}
      shadow="md"
      withArrow
      withinPortal
    >
      <Popover.Target>
        <Tooltip
          label={<Trans>Select websites to apply this shortcut to</Trans>}
          withArrow
        >
          <Badge
            className="only-website-badge"
            variant="light"
            size="sm"
            color={badgeColor}
            contentEditable={false}
            radius="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            pr={4}
            pl={6}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            styles={{ root: { textTransform: 'none' } }}
            rightSection={
              <Box ml={4} style={{ display: 'flex', alignItems: 'center' }}>
                <IconChevronDown
                  size={12}
                  style={{
                    transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </Box>
            }
          >
            {selectedDisplayText}
          </Badge>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Stack gap="xs">
          {/* Header */}
          <Box>
            <Group align="apart" p="xs" style={{ alignItems: 'center' }}>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconWorld size={14} />
                </ThemeIcon>
                <Text size="sm" fw={600}>
                  <Trans>Websites</Trans>
                </Text>
              </Group>
              <Badge size="xs" variant="filled" color={badgeColor}>
                {selectedWebsiteIds.length === 0 ? (
                  <Trans>All</Trans>
                ) : (
                  `${selectedWebsiteIds.length} / ${websites.length}`
                )}
              </Badge>
            </Group>

            <Divider />
          </Box>

          {/* Search */}
          <Box p="sm" py={0}>
            <TextInput
              leftSection={<IconSearch size={14} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="xs"
              rightSection={
                searchTerm ? (
                  <UnstyledButton onClick={() => setSearchTerm('')}>
                    <IconX size={14} />
                  </UnstyledButton>
                ) : null
              }
            />
          </Box>

          {/* Action buttons */}
          <Box px="sm" pb="0">
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="blue"
                onClick={handleSelectAll}
                style={{ flex: 1 }}
              >
                {selectedWebsiteIds.length === websites.length ? (
                  <Trans>Deselect All</Trans>
                ) : (
                  <Trans>Select All</Trans>
                )}
              </Button>
            </Group>
          </Box>

          <Divider />

          {/* Website list */}
          <Box style={{ maxHeight: '200px', overflow: 'auto' }}>
            {filteredWebsiteOptions.length > 0 ? (
              <Stack gap={0} p="xs">
                {filteredWebsiteOptions.map((option) => {
                  const isSelected = selectedWebsiteIds.includes(option.value);
                  return (
                    <UnstyledButton
                      className="only-website-toggle-btn"
                      key={option.value}
                      onClick={() => handleWebsiteToggle(option.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: 'var(--mantine-radius-sm)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}} // Handled by button click
                          size="xs"
                          color="blue"
                          styles={{ input: { cursor: 'pointer' } }}
                        />
                        <Text
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                          fw={isSelected ? 500 : 400}
                          c={isSelected ? 'blue' : undefined}
                        >
                          {option.label}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            ) : (
              <Box p="md">
                <Text ta="center" c="dimmed" size="sm">
                  <Trans>No items found</Trans>
                </Text>
              </Box>
            )}
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
