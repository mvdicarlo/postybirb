import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Collapse,
  Divider,
  Grid,
  Group,
  NumberInput,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { AccountId, FileMetadataFields, IAccount, ISubmissionFileDto, IWebsiteInfoDto } from '@postybirb/types';
import { IconChevronDown, IconChevronRight, IconRestore } from '@tabler/icons-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { getAccountDimensions, removeAccountDimensions, updateAccountDimensions, computeScale, formatAspect } from './file-dimensions-helpers';
import { useWebsites } from '../../../../../../hooks/account/use-websites';

interface Props {
  accounts: IAccount[];
  file: ISubmissionFileDto;
  metadata: FileMetadataFields;
  save: () => void;
}

export function CustomAccountDimensions({ accounts, file, metadata, save }: Props) {
  const { websites } = useWebsites();
  const [sectionCollapsed, setSectionCollapsed] = useState(true);

  const accountGroups = useMemo(() => {
    const groups: Record<string, { accounts: IAccount[]; website: IWebsiteInfoDto }> = {};
    accounts.forEach((account) => {
      const website = websites.find((w) => w.id === account.website) as IWebsiteInfoDto | undefined;
      if (website) {
        if (!groups[website.id]) groups[website.id] = { accounts: [], website };
        groups[website.id].accounts.push(account);
      }
    });
    return groups;
  }, [accounts, websites]);

  const [accountDimensions, setAccountDimensions] = useState<
    Record<AccountId, { height: number; width: number }>
  >(() => {
    const initial: Record<AccountId, { height: number; width: number }> = {};
    accounts.forEach((account) => {
      const dims = getAccountDimensions(metadata, account.id, file);
      initial[account.id] = {
        height: dims.height || file.height,
        width: dims.width || file.width,
      };
    });
    return initial;
  });

  // Add any newly added accounts to local dimension state with defaults
  useEffect(() => {
    let changed = false;
    const base = metadata.dimensions.default ?? file;
    accounts.forEach((account) => {
      if (!accountDimensions[account.id]) {
        changed = true;
        accountDimensions[account.id] = { height: base.height, width: base.width };
      }
    });
    if (changed) {
      setAccountDimensions({ ...accountDimensions });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const [collapsedWebsites, setCollapsedWebsites] = useState<Record<string, boolean>>({});
  // Removed per-account lock state (always aspect locked)
  const debounceRef = useRef<Record<AccountId, number>>({});

  const toggleWebsiteCollapse = (websiteId: string) =>
    setCollapsedWebsites((p) => ({ ...p, [websiteId]: !p[websiteId] }));
  const toggleLock = (id: AccountId) => {}; // no-op since always locked

  const scheduleSave = (id: AccountId) => {
    const map = debounceRef.current;
    if (map[id]) window.clearTimeout(map[id]);
    map[id] = window.setTimeout(() => save(), 400);
  };

  const setH = (id: AccountId, h: number) => {
    setAccountDimensions((prev) => {
      const ratio = file.width / file.height; // width / height
      const clampedH = Math.min(Math.max(1, h), file.height);
      const newW = Math.min(Math.round(clampedH * ratio), file.width);
      return { ...prev, [id]: { height: clampedH, width: newW || 1 } };
    });
  };

  const setW = (id: AccountId, w: number) => {
    setAccountDimensions((prev) => {
      const ratio = file.width / file.height;
      const clampedW = Math.min(Math.max(1, w), file.width);
      const newH = Math.min(Math.round(clampedW / ratio), file.height);
      return { ...prev, [id]: { height: newH || 1, width: clampedW } };
    });
  };

  const applyAndSave = (id: AccountId) => {
    const dims = accountDimensions[id];
    updateAccountDimensions(metadata, file, id, dims.height, dims.width);
    scheduleSave(id);
  };

  if (Object.keys(accountGroups).length === 0) return null;

  return (
    <Box mt="md">
      <Card withBorder p="sm" radius="md" mb="sm">
        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => setSectionCollapsed((v) => !v)}>
          <ActionIcon size="xs" variant="transparent" c="gray">
            {sectionCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
          <Text size="sm" fw={600}>
            <Trans>Custom Dimensions</Trans>
          </Text>
          <Badge size="xs" variant="light" color="gray">{accounts.length}</Badge>
        </Group>
        <Collapse in={!sectionCollapsed}>
          <Text size="xs" c="dimmed" mt="xs" mb="sm">
            <Trans>Override default dimensions for specific accounts</Trans>
          </Text>
          {Object.entries(accountGroups).map(
            ([websiteId, { accounts: websiteAccounts, website }]) => {
              const isCollapsed = collapsedWebsites[websiteId] || false;
              return (
                <Card key={websiteId} withBorder mb="sm" p="sm" radius="md">
                  <Group
                    gap="xs"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleWebsiteCollapse(websiteId)}
                  >
                    <ActionIcon size="xs" variant="transparent" c="gray">
                      {isCollapsed ? (
                        <IconChevronRight size={14} />
                      ) : (
                        <IconChevronDown size={14} />
                      )}
                    </ActionIcon>
                    <Text size="sm" fw={500}>
                      {website.displayName}
                    </Text>
                    <Badge size="xs" variant="light" color="gray">
                      {websiteAccounts.length}
                    </Badge>
                  </Group>
                  <Collapse in={!isCollapsed}>
                    <Divider my={8} variant="dashed" />
                    <Grid gutter="xs">
                      {websiteAccounts.map((account) => {
                        const accountDims = accountDimensions[account.id] || { height: 1, width: 1 };
                        const hasCustomDimensions = metadata.dimensions[account.id] !== undefined;
                        const scale = computeScale(accountDims.height, accountDims.width, file.height, file.width);
                        const aspectText = formatAspect(accountDims.height, accountDims.width);
                        return (
                          <Grid.Col span={12} key={account.id} pt="xs">
                            <Box pl="34px" px="xs" py={6} style={{ background: 'var(--mantine-color-body)', borderRadius: 6 }}>
                              <Group justify="space-between" mb={2} wrap="nowrap" align="center">
                                <Group gap={6} align="center" style={{ lineHeight: 1.1 }}>
                                  <Text size="sm" fw={500} style={{ paddingTop: 1 }}>{account.name}</Text>
                                  {hasCustomDimensions ? (
                                    <Badge size="xs" color={scale.percent === 100 ? 'gray' : 'blue'}>{scale.percent}%</Badge>
                                  ) : (
                                    <Badge size="xs" variant="outline" color="gray"><Trans>Default</Trans></Badge>
                                  )}
                                  {aspectText && hasCustomDimensions && (
                                    <Text size="xs" c="dimmed" style={{ paddingTop: 1 }}>{aspectText}</Text>
                                  )}
                                </Group>
                                <Group gap={4} align="center">
                                  <Tooltip label={<Trans>Reset</Trans>}>
                                    <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); const d = metadata.dimensions.default ?? file; setAccountDimensions((prev) => ({ ...prev, [account.id]: { height: d.height, width: d.width } })); removeAccountDimensions(metadata, account.id); scheduleSave(account.id); }}>
                                      <IconRestore size={12} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Switch size="xs" checked={hasCustomDimensions} onChange={(e) => { const enabled = e.currentTarget.checked; if (!enabled) { removeAccountDimensions(metadata, account.id); const d = metadata.dimensions.default ?? file; setAccountDimensions((prev) => ({ ...prev, [account.id]: { height: d.height, width: d.width } })); scheduleSave(account.id); } else { const dims = accountDimensions[account.id]; updateAccountDimensions(metadata, file, account.id, dims.height, dims.width); scheduleSave(account.id); } }} label={<Trans>Custom</Trans>} />
                                </Group>
                              </Group>
                              {hasCustomDimensions && (
                                <Group gap="xs" align="end" wrap="nowrap" mt={4}>
                                  <NumberInput label={<Trans>Height</Trans>} value={accountDims.height} max={file.height} min={1} size="xs" step={10} onChange={(val) => { setH(account.id, Number(val) || 1); }} onBlur={() => applyAndSave(account.id)} styles={{ input: { width: 85 } }} />
                                  <Text px={4} pb={4}>×</Text>
                                  <NumberInput label={<Trans>Width</Trans>} value={accountDims.width} max={file.width} min={1} size="xs" step={10} onChange={(val) => { setW(account.id, Number(val) || 1); }} onBlur={() => applyAndSave(account.id)} styles={{ input: { width: 85 } }} />
                                </Group>
                              )}
                            </Box>
                          </Grid.Col>
                        );
                      })}
                    </Grid>
                  </Collapse>
                </Card>
              );
            })}
        </Collapse>
      </Card>
    </Box>
  );
}
