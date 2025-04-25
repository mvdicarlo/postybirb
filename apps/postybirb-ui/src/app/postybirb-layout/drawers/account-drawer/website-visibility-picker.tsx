import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Input,
  Popover,
  ScrollArea,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconEye, IconSearch, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useWebsites } from '../../../../hooks/account/use-websites';

export function WebsiteVisibilityPicker() {
  const { websites, isLoading, filteredWebsites, setHiddenWebsites } =
    useWebsites();
  const { _ } = useLingui();
  const [opened, { toggle, close }] = useDisclosure(false);
  const [search, setSearch] = useState('');

  const visibleWebsiteIds = useMemo(
    () => filteredWebsites.map((website) => website.id),
    [filteredWebsites],
  );

  const filteredWebsitesList = useMemo(
    () =>
      websites.filter((website) =>
        website.displayName.toLowerCase().includes(search.toLowerCase()),
      ),
    [websites, search],
  );

  const toggleWebsiteVisibility = (websiteId: string, isVisible: boolean) => {
    const newHiddenWebsites = isVisible
      ? websites
          .map((website) => website.id)
          .filter((id) => !visibleWebsiteIds.includes(id) && id !== websiteId)
      : [
          ...websites
            .map((website) => website.id)
            .filter((id) => !visibleWebsiteIds.includes(id)),
          websiteId,
        ];

    setHiddenWebsites(newHiddenWebsites);
  };

  const toggleAllWebsites = (visible: boolean) => {
    const newHiddenWebsites = visible
      ? []
      : websites.map((website) => website.id);
    setHiddenWebsites(newHiddenWebsites);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Box mb="xs">
      <Popover
        position="bottom-start"
        width={300}
        shadow="md"
        opened={opened}
        onChange={toggle}
      >
        <Popover.Target>
          <Group p="apart" style={{ cursor: 'pointer' }} onClick={toggle}>
            <Group gap={8}>
              <IconEye size={16} />
              <Text size="sm" fw={500}>
                <Trans>Website Visibility</Trans>
              </Text>
            </Group>
            <Badge size="sm" variant="light">
              {filteredWebsites.length}/{websites.length}
            </Badge>
          </Group>
        </Popover.Target>

        <Popover.Dropdown>
          <Box mb="xs">
            <Input
              size="xs"
              placeholder={_(msg`Search websites...`)}
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              rightSection={
                search ? (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    onClick={() => setSearch('')}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
            />
          </Box>

          <Group mb="xs" p="apart">
            <Button
              size="xs"
              variant="light"
              onClick={() => toggleAllWebsites(true)}
            >
              <Trans>Show All</Trans>
            </Button>
            <Button
              size="xs"
              variant="light"
              onClick={() => toggleAllWebsites(false)}
            >
              <Trans>Hide All</Trans>
            </Button>
          </Group>

          <ScrollArea.Autosize mah={200}>
            <Box>
              {filteredWebsitesList.length > 0 ? (
                filteredWebsitesList.map((website) => {
                  const isVisible = visibleWebsiteIds.includes(website.id);
                  return (
                    <Group
                      key={website.id}
                      p="apart"
                      py={6}
                      px={8}
                      style={(theme) => ({
                        borderRadius: theme.radius.sm,

                        cursor: 'pointer',
                      })}
                      onClick={() =>
                        toggleWebsiteVisibility(website.id, !isVisible)
                      }
                    >
                      <Group gap={8}>
                        <Text
                          size="sm"
                          lineClamp={1}
                          style={{ maxWidth: '200px' }}
                        >
                          {website.displayName}
                        </Text>
                        {website.accounts.length > 0 && (
                          <Badge size="xs" variant="filled" radius="xl">
                            {website.accounts.length}
                          </Badge>
                        )}
                      </Group>
                      <ActionIcon
                        size="sm"
                        variant={isVisible ? 'light' : 'subtle'}
                        color={isVisible ? 'blue' : 'gray'}
                      >
                        {isVisible ? (
                          <IconCheck size={14} />
                        ) : (
                          <IconX size={14} />
                        )}
                      </ActionIcon>
                    </Group>
                  );
                })
              ) : (
                <Text c="dimmed" ta="center" size="sm" py="xs">
                  <Trans>No websites match your search</Trans>
                </Text>
              )}
            </Box>
          </ScrollArea.Autosize>

          <Group p="right" mt="xs">
            <Button size="xs" onClick={close}>
              <Trans>Done</Trans>
            </Button>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
