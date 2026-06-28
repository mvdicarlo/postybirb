import type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyType,
  WebsiteProxyChoice,
} from '@postybirb/types';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconPlug,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import proxyApi from '../../../../api/proxy.api';
import settingsApi from '../../../../api/settings.api';
import { useAccounts } from '../../../../stores/entity/account-store';
import { useWebsites } from '../../../../stores/entity/website-store';
import { isRemote } from '../../../../transports/http-client';
import {
  showConnectionErrorNotification,
  showConnectionSuccessNotification,
} from '../../../../utils/notifications';

function createEmptyPoolEntry(): ProxyPoolEntry {
  return {
    id: crypto.randomUUID(),
    label: '',
    type: 'http',
    host: '',
    port: '',
    username: '',
    password: '',
  };
}

const DEFAULT_PROXY_CONFIGURATION: ProxyConfiguration = {
  mode: 'system',
  pool: [],
  routing: {},
};

function isValidPoolEntry(entry: ProxyPoolEntry): boolean {
  const parsed = Number.parseInt(entry.port.trim(), 10);

  return (
    Boolean(entry.id.trim() && entry.host.trim()) &&
    Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= 65535
  );
}

function poolEntryLabel(
  entry: ProxyPoolEntry,
  index: number,
  labelProxy: (index: number) => string,
): string {
  if (entry.label?.trim()) {
    return entry.label.trim();
  }

  return labelProxy(index);
}

function resolveRoutingChoice(
  choice: WebsiteProxyChoice,
  validPoolIds: Set<string>,
): WebsiteProxyChoice {
  if (choice === 'system' || choice === 'direct') {
    return choice;
  }

  return validPoolIds.has(choice) ? choice : 'system';
}

const PROXY_SCOPE_STORAGE_KEY = 'proxy_settings_scope';

type ProxySettingsScope = 'client' | 'server';

function readStoredProxyScope(): ProxySettingsScope {
  const stored = localStorage.getItem(PROXY_SCOPE_STORAGE_KEY);
  return stored === 'server' ? 'server' : 'client';
}

function serializeProxyForCompare(config: ProxyConfiguration): string {
  return JSON.stringify({
    mode: config.mode,
    fixedProxyId: config.fixedProxyId ?? null,
    pool: config.pool.map(({ password: _password, ...entry }) => entry),
    routing: config.routing,
  });
}

export function ProxySettingsSection() {
  const remoteMode = isRemote();
  const { t } = useLingui();

  const {
    data: serverStartupSettings,
    isLoading: isServerLoading,
    refetch: refetchServer,
  } = useQuery(
    'startup-settings-server',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    { cacheTime: 0, enabled: remoteMode },
  );

  const {
    data: localStartupSettings,
    isLoading: isLocalLoading,
    refetch: refetchLocal,
  } = useQuery(
    'startup-settings-local',
    () =>
      remoteMode
        ? settingsApi.getLocalStartupOptions().then((res) => res.body)
        : settingsApi.getStartupOptions().then((res) => res.body),
    { cacheTime: 0 },
  );

  const [scope, setScope] = useState<ProxySettingsScope>(readStoredProxyScope);

  if (isLocalLoading || (remoteMode && isServerLoading)) {
    return <Loader />;
  }

  if (!remoteMode) {
    const proxy = localStartupSettings?.proxy ?? DEFAULT_PROXY_CONFIGURATION;
    return (
      <ProxySettingsForm proxy={proxy} scope={null} refetch={refetchLocal} />
    );
  }

  const activeStartupSettings =
    scope === 'client' ? localStartupSettings : serverStartupSettings;
  const proxy = activeStartupSettings?.proxy ?? DEFAULT_PROXY_CONFIGURATION;

  return (
    <Stack gap="md">
      <SegmentedControl
        value={scope}
        onChange={(value) => {
          const nextScope = value as ProxySettingsScope;
          localStorage.setItem(PROXY_SCOPE_STORAGE_KEY, nextScope);
          setScope(nextScope);
        }}
        data={[
          { value: 'client', label: t`Client (this device)` },
          { value: 'server', label: t`Server (remote host)` },
        ]}
      />

      <Alert color="blue">
        {scope === 'client' ? (
          <Trans>
            Applies to login webviews and other traffic on this computer. Remote
            posting still uses the server proxy below unless you configure it
            separately.
          </Trans>
        ) : (
          <Trans>
            Applies to posting and background tasks on the remote host. Does not
            change proxy settings on this device.
          </Trans>
        )}
      </Alert>

      <ProxySettingsForm
        key={scope}
        proxy={proxy}
        scope={scope}
        refetch={scope === 'client' ? refetchLocal : refetchServer}
      />
    </Stack>
  );
}

function ProxySettingsForm({
  proxy,
  scope,
  refetch,
}: {
  proxy: ProxyConfiguration;
  scope: ProxySettingsScope | null;
  refetch: () => Promise<unknown>;
}) {
  const { t } = useLingui();
  const websites = useWebsites();
  const accounts = useAccounts();
  const [config, setConfig] = useState<ProxyConfiguration>(() => proxy);
  const [showPasswordById, setShowPasswordById] = useState<
    Record<string, boolean>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [testingPoolEntryId, setTestingPoolEntryId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (isSaving) {
      return;
    }

    setConfig((current) => {
      const incoming = proxy;
      if (
        serializeProxyForCompare(current) === serializeProxyForCompare(incoming)
      ) {
        return current;
      }

      return incoming;
    });
  }, [proxy, isSaving]);

  const usesLocalProxyTarget = scope === null || scope === 'client';

  const websitesWithAccounts = useMemo(() => {
    const websiteIds = new Set(accounts.map((account) => account.website));
    return websites
      .filter((website) => websiteIds.has(website.id))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [accounts, websites]);

  const proxyTypeOptions = useMemo(
    () => [
      { value: 'http' as ProxyType, label: t`HTTP(S)` },
      { value: 'socks5' as ProxyType, label: t`SOCKS5` },
    ],
    [t],
  );

  const proxyModeOptions = useMemo(
    () => [
      { value: 'system' as ProxyMode, label: t`System proxy` },
      { value: 'direct' as ProxyMode, label: t`Direct (no proxy)` },
      {
        value: 'fixed_servers' as ProxyMode,
        label: t`Fixed proxy (all traffic)`,
      },
      {
        value: 'pac_routing' as ProxyMode,
        label: t`Per-website routing (PAC)`,
      },
    ],
    [t],
  );

  const labelProxyEntry = useMemo(
    () => (index: number) => {
      const number = index + 1;
      return t`Proxy ${number}`;
    },
    [t],
  );

  const validPoolIds = useMemo(
    () =>
      new Set(
        config.pool
          .filter((entry) => isValidPoolEntry(entry))
          .map((entry) => entry.id),
      ),
    [config.pool],
  );

  const routingChoiceOptions = useMemo(() => {
    const options = [
      { value: 'system', label: t`System proxy` },
      { value: 'direct', label: t`Direct (no proxy)` },
      ...config.pool
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => isValidPoolEntry(entry))
        .map(({ entry, index }) => ({
          value: entry.id,
          label: poolEntryLabel(entry, index, labelProxyEntry),
        })),
    ];

    return options;
  }, [config.pool, labelProxyEntry, t]);

  const fixedProxyOptions = useMemo(
    () =>
      config.pool
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => isValidPoolEntry(entry))
        .map(({ entry, index }) => ({
          value: entry.id,
          label: poolEntryLabel(entry, index, labelProxyEntry),
        })),
    [config.pool, labelProxyEntry],
  );

  const isDirty =
    serializeProxyForCompare(config) !== serializeProxyForCompare(proxy);
  const canSave = isDirty && !isSaving;

  const updateConfig = (patch: Partial<ProxyConfiguration>): void => {
    setConfig((current) => ({ ...current, ...patch }));
  };

  const updatePoolEntry = (
    entryId: string,
    patch: Partial<ProxyPoolEntry>,
  ): void => {
    setConfig((current) => ({
      ...current,
      pool: current.pool.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const removePoolEntry = (entryId: string): void => {
    setConfig((current) => {
      const routing = { ...current.routing };
      for (const [websiteId, choice] of Object.entries(routing)) {
        if (choice === entryId) {
          routing[websiteId] = 'system';
        }
      }

      return {
        ...current,
        pool: current.pool.filter((entry) => entry.id !== entryId),
        fixedProxyId:
          current.fixedProxyId === entryId ? undefined : current.fixedProxyId,
        routing,
      };
    });
  };

  const addPoolEntry = (): void => {
    setConfig((current) => ({
      ...current,
      pool: [...current.pool, createEmptyPoolEntry()],
    }));
  };

  const updateRouting = (
    websiteId: string,
    choice: WebsiteProxyChoice,
  ): void => {
    setConfig((current) => ({
      ...current,
      routing: {
        ...current.routing,
        [websiteId]: choice,
      },
    }));
  };

  const handleModeChange = (mode: ProxyMode | null): void => {
    if (!mode) {
      return;
    }

    setConfig((current) => {
      const next: ProxyConfiguration = { ...current, mode };

      if (mode === 'pac_routing') {
        const routing = { ...current.routing };
        for (const website of websitesWithAccounts) {
          if (!routing[website.id]) {
            routing[website.id] = 'system';
          }
        }
        next.routing = routing;
        next.fixedProxyId = undefined;
      }

      if (mode === 'fixed_servers') {
        next.routing = {};
        next.pacAccessToken = undefined;

        if (!current.fixedProxyId?.trim()) {
          const poolIds = new Set(current.pool.map((entry) => entry.id));
          const usedPoolIds = new Set<string>();

          for (const choice of Object.values(current.routing)) {
            if (
              choice !== 'direct' &&
              choice !== 'system' &&
              poolIds.has(choice)
            ) {
              usedPoolIds.add(choice);
            }
          }

          if (usedPoolIds.size === 1) {
            const [inferredFixedProxyId] = [...usedPoolIds];
            next.fixedProxyId = inferredFixedProxyId;
          } else if (current.pool.length === 1) {
            next.fixedProxyId = current.pool[0]?.id;
          }
        }
      }

      if (mode === 'system' || mode === 'direct') {
        next.fixedProxyId = undefined;
        next.pacAccessToken = undefined;
      }

      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      if (usesLocalProxyTarget) {
        await settingsApi.updateLocalSystemStartupSettings({
          proxy: config,
        });
      } else {
        await settingsApi.updateSystemStartupSettings({
          proxy: config,
        });
      }

      await refetch();
      showConnectionSuccessNotification(
        usesLocalProxyTarget ? (
          <Trans>Proxy settings saved and applied on this device</Trans>
        ) : (
          <Trans>Proxy settings saved on the remote server</Trans>
        ),
      );
    } catch {
      showConnectionErrorNotification(
        <Trans>Failed to save proxy settings</Trans>,
        <Trans>Check that pool entries and routing choices are valid</Trans>,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const testPoolEntry = async (entry: ProxyPoolEntry): Promise<void> => {
    if (!entry.host.trim() || !entry.port.trim()) {
      showConnectionErrorNotification(
        <Trans>Configuration Error</Trans>,
        <Trans>Proxy host and port are required</Trans>,
      );
      return;
    }

    setTestingPoolEntryId(entry.id);
    try {
      const payload = {
        ...entry,
        host: entry.host.trim(),
        port: entry.port.trim(),
        username: entry.username.trim(),
      };
      const result = usesLocalProxyTarget
        ? await proxyApi.testLocalPoolEntryConnection(payload)
        : await proxyApi.testPoolEntryConnection(payload);

      if (result.body.success) {
        showConnectionSuccessNotification(
          <Trans>Proxy connection test succeeded</Trans>,
        );
      } else {
        showConnectionErrorNotification(
          <Trans>Connection Failed</Trans>,
          result.body.message,
        );
      }
    } catch {
      showConnectionErrorNotification(
        <Trans>Connection Failed</Trans>,
        <Trans>
          Could not reach the test URL through the configured proxy
        </Trans>,
      );
    } finally {
      setTestingPoolEntryId(null);
    }
  };

  const showPoolEditor =
    config.mode === 'fixed_servers' || config.mode === 'pac_routing';
  const showFixedProxyPicker = config.mode === 'fixed_servers';
  const showRoutingTable = config.mode === 'pac_routing';

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Proxy</Trans>
        </Title>

        <Text size="sm" c="dimmed" mb="md">
          <Trans>
            Choose how all outbound traffic is routed.
          </Trans>
        </Text>

        <Stack gap="md">
          <Select
            label={<Trans>Routing mode</Trans>}
            data={proxyModeOptions}
            value={config.mode}
            onChange={(value) => handleModeChange(value as ProxyMode | null)}
          />

          {config.mode === 'system' && (
            <Alert color="gray">
              <Trans>
                Uses the operating system proxy settings for all traffic.
              </Trans>
            </Alert>
          )}

          {config.mode === 'direct' && (
            <Alert color="gray">
              <Trans>All traffic connects directly without a proxy.</Trans>
            </Alert>
          )}

          {showPoolEditor && (
            <Stack gap="md">
              <Text fw={600}>
                <Trans>Proxy pool</Trans>
              </Text>

              {config.pool.length === 0 && (
                <Alert color="gray">
                  <Trans>Add at least one proxy entry to use this mode.</Trans>
                </Alert>
              )}

              {config.pool.map((entry, index) => {
                const showPassword = showPasswordById[entry.id] ?? false;

                return (
                  <Card key={entry.id} withBorder padding="md">
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start">
                        <Text fw={600}>
                          <Trans>Proxy {index + 1}</Trans>
                        </Text>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={t`Remove proxy`}
                          onClick={() => removePoolEntry(entry.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>

                      <TextInput
                        label={<Trans>Label (optional)</Trans>}
                        value={entry.label ?? ''}
                        onChange={(event) =>
                          updatePoolEntry(entry.id, {
                            label: event.currentTarget.value,
                          })
                        }
                      />

                      <Select
                        label={<Trans>Proxy type</Trans>}
                        data={proxyTypeOptions}
                        value={entry.type}
                        onChange={(value) => {
                          const type = (value as ProxyType) ?? 'http';
                          updatePoolEntry(entry.id, {
                            type,
                            ...(type === 'socks5'
                              ? { username: '', password: '' }
                              : {}),
                          });
                        }}
                      />

                      <Group grow align="flex-start">
                      <TextInput
                        label={<Trans>Host</Trans>}
                        leftSection={<IconPlug size={18} />}
                        placeholder="proxy.example.com"
                        value={entry.host}
                        onChange={(event) =>
                          updatePoolEntry(entry.id, {
                            host: event.currentTarget.value,
                            })
                          }
                        />
                        <TextInput
                          label={<Trans>Port</Trans>}
                          placeholder="8080"
                          value={entry.port}
                          onChange={(event) =>
                            updatePoolEntry(entry.id, {
                              port: event.currentTarget.value,
                            })
                          }
                          type="number"
                          min={1}
                          max={65535}
                        />
                      </Group>

                      {entry.type === 'http' ? (
                        <Group grow align="flex-start">
                          <TextInput
                            label={<Trans>Username (optional)</Trans>}
                            value={entry.username}
                            onChange={(event) =>
                              updatePoolEntry(entry.id, {
                                username: event.currentTarget.value,
                              })
                            }
                          />
                          <TextInput
                            label={<Trans>Password (optional)</Trans>}
                            type={showPassword ? 'text' : 'password'}
                            value={entry.password}
                            onChange={(event) =>
                              updatePoolEntry(entry.id, {
                                password: event.currentTarget.value,
                              })
                            }
                            rightSection={
                              <Button
                                variant="subtle"
                                size="compact-sm"
                                onClick={() =>
                                  setShowPasswordById((current) => ({
                                    ...current,
                                    [entry.id]: !showPassword,
                                  }))
                                }
                              >
                                {showPassword ? (
                                  <IconEyeOff size={16} />
                                ) : (
                                  <IconEye size={16} />
                                )}
                              </Button>
                            }
                          />
                        </Group>
                      ) : null}

                      <Button
                        variant="outline"
                        leftSection={<IconPlug size={16} />}
                        loading={testingPoolEntryId === entry.id}
                        disabled={!entry.host.trim() || !entry.port.trim()}
                        onClick={() => testPoolEntry(entry)}
                      >
                        <Trans>Test Connection</Trans>
                      </Button>
                    </Stack>
                  </Card>
                );
              })}

              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={addPoolEntry}
              >
                <Trans>Add proxy</Trans>
              </Button>
            </Stack>
          )}

          {showFixedProxyPicker && (
            <Select
              label={<Trans>Proxy for all traffic</Trans>}
              placeholder={t`Select a pool entry`}
              data={fixedProxyOptions}
              value={config.fixedProxyId ?? null}
              onChange={(value) =>
                updateConfig({ fixedProxyId: value ?? undefined })
              }
            />
          )}

          {showRoutingTable && (
            <Stack gap="sm">
              <Text fw={600}>
                <Trans>Website routing</Trans>
              </Text>

              {websitesWithAccounts.length === 0 ? (
                <Alert color="gray">
                  <Trans>
                    Add an account to configure per-website proxy routing.
                  </Trans>
                </Alert>
              ) : (
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        <Trans>Website</Trans>
                      </Table.Th>
                      <Table.Th>
                        <Trans>Route via</Trans>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {websitesWithAccounts.map((website) => {
                      const storedChoice =
                        config.routing[website.id] ?? 'system';
                      const choice = resolveRoutingChoice(
                        storedChoice,
                        validPoolIds,
                      );
                      const showsTelegramHttpHint =
                        website.id === 'telegram' &&
                        config.pool.some(
                          (entry) =>
                            entry.id === choice && entry.type === 'http',
                        );

                      return (
                        <Table.Tr key={website.id}>
                          <Table.Td>{website.displayName}</Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              <Select
                                data={routingChoiceOptions}
                                value={choice}
                                onChange={(value) => {
                                  if (value) {
                                    updateRouting(website.id, value);
                                  }
                                }}
                              />
                              {showsTelegramHttpHint && (
                                <Text size="xs" c="yellow">
                                  <Trans>
                                    Telegram requires a SOCKS5 proxy entry.
                                  </Trans>
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          )}

          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={isSaving}
              disabled={!canSave}
              onClick={handleSave}
            >
              <Trans>Save</Trans>
            </Button>
          </Group>

          <Alert color="blue">
            {usesLocalProxyTarget ? (
              <Trans>Saved settings apply on this device right away.</Trans>
            ) : (
              <Trans>
                Saved settings apply on the remote server for posting and
                background tasks.
              </Trans>
            )}
          </Alert>
        </Stack>
      </Box>
    </Stack>
  );
}
