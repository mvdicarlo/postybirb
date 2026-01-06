/**
 * WebsiteVisibilityPicker - Popover to toggle website visibility.
 * Allows users to show/hide specific websites from the accounts list.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Checkbox,
    Popover,
    ScrollArea,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useWebsites } from '../../../stores/entity/website-store';
import { useAccountsFilter } from '../../../stores/ui/accounts-ui-store';

/**
 * Popover component for toggling website visibility in the accounts list.
 */
export function WebsiteVisibilityPicker() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const websites = useWebsites();
  const { hiddenWebsites, toggleWebsiteVisibility } = useAccountsFilter();

  const hiddenCount = hiddenWebsites.length;
  const hasHidden = hiddenCount > 0;

  return (
    <Popover
      opened={opened}
      onClose={close}
      position="bottom-end"
      width={250}
      shadow="md"
    >
      <Popover.Target>
        <Tooltip label={<Trans>Toggle website visibility</Trans>}>
          <Box>
            <ActionIcon
              variant={hasHidden ? 'light' : 'subtle'}
              color={hasHidden ? 'yellow' : 'gray'}
              size="sm"
              onClick={toggle}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Toggle website visibility"
            >
              {hasHidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </ActionIcon>

            <Badge
              size="xs"
              style={{ verticalAlign: 'text-top' }}
              variant="transparent"
              c="dimmed"
            >
              {hasHidden
                ? ` ${websites.length - hiddenCount} / ${websites.length}`
                : ''}
            </Badge>
          </Box>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">
            <Trans>Show/Hide Websites</Trans>
          </Text>

          <ScrollArea.Autosize mah={300} type="auto" offsetScrollbars>
            <Stack gap={4}>
              {websites.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="sm">
                  <Trans>No websites available</Trans>
                </Text>
              ) : (
                websites.map((website) => (
                  <Checkbox
                    key={website.id}
                    size="xs"
                    label={website.displayName}
                    checked={!hiddenWebsites.includes(website.id)}
                    onChange={() => toggleWebsiteVisibility(website.id)}
                  />
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>

          {hasHidden && (
            <Text size="xs" c="dimmed" ta="center">
              <Trans>{hiddenCount} hidden</Trans>
            </Text>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
