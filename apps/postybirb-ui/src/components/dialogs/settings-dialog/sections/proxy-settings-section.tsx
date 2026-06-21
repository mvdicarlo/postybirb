import type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyType,
  WebsiteProxyChoice,
} from '@postybirb/types';
import {
  defaultProxyConfiguration,
  isProxyConfiguration,
  validateProxyConfiguration,
} from '@postybirb/types';
import { Trans } from '@lingui/react/macro';
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
import settingsApi from '../../../../api/settings.api';
import { resetGlobalProxyReadyCache } from '../../../../hooks/use-global-proxy-ready';
import { useAccounts } from '../../../../stores/entity/account-store';
import { useWebsites } from '../../../../stores/entity/website-store';
import { isRemote } from '../../../../transports/http-client';
import {
  showConnectionErrorNotification,
  showConnectionSuccessNotification,
} from '../../../../utils/notifications';

const PROXY_TYPE_OPTIONS: { value: ProxyType; label: string }[] = [
  { value: 'http', label: 'HTTP(S)' },
  { value: 'socks5', label: 'SOCKS5' },
];

const PROXY_MODE_OPTIONS: { value: ProxyMode; label: string }[] = [
  { value: 'system', label: 'System proxy' },
  { value: 'direct', label: 'Direct (no proxy)' },
  { value: 'fixed_servers', label: 'Fixed proxy (all traffic)' },
  { value: 'pac_routing', label: 'Per-website routing (PAC)' },
];

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

function cloneProxyConfiguration(config: ProxyConfiguration): ProxyConfiguration {
  return {
    ...config,
    pool: config.pool.map((entry) => ({ ...entry })),
    routing: { ...config.routing },
  };
}

function normalizeStartupProxy(raw: unknown): ProxyConfiguration {
  if (isProxyConfiguration(raw)) {
    return cloneProxyConfiguration(raw);
  }

  return defaultProxyConfiguration();
}

function poolEntryLabel(entry: ProxyPoolEntry): string {
  if (entry.label?.trim()) {
    return entry.label.trim();
  }

  if (entry.host.trim() && entry.port.trim()) {
    return `${entry.host.trim()}:${entry.port.trim()}`;
  }

  return entry.id.slice(0, 8);
}

const PROXY_SCOPE_STORAGE_KEY = 'proxy_settings_scope';

type ProxySettingsScope = 'client' | 'server';

function readStoredProxyScope(): ProxySettingsScope {
  const stored = localStorage.getItem(PROXY_SCOPE_STORAGE_KEY);
  return stored === 'server' ? 'server' : 'client';
}

function buildProxyPatch(config: ProxyConfiguration) {
  return {
    mode: config.mode,
    pool: config.pool.map((entry) => ({
      ...entry,
      label: entry.label?.trim() || undefined,
      host: entry.host.trim(),
      port: entry.port.trim(),
      username: entry.username.trim(),
    })),
    fixedProxyId: config.fixedProxyId,
    routing: config.routing,
  };
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
    const proxy = normalizeStartupProxy(localStartupSettings?.proxy);
    return (
      <ProxySettingsForm
        proxy={proxy}
        scope={null}
        refetch={refetchLocal}
      />
    );
  }

  const activeStartupSettings =
    scope === 'client' ? localStartupSettings : serverStartupSettings;
  const proxy = normalizeStartupProxy(activeStartupSettings?.proxy);

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
          { value: 'client', label: 'Client (this device)' },
          { value: 'server', label: 'Server (remote host)' },
        ]}
      />

      <Alert color="blue">
        {scope === 'client' ? (
          <Trans>
            Applies to login webviews and other traffic on this computer.
            Remote posting still uses the server proxy below unless you configure
            it separately.
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
  const websites = useWebsites();
  const accounts = useAccounts();
  const [config, setConfig] = useState<ProxyConfiguration>(() =>
    cloneProxyConfiguration(proxy),
  );
  const [showPasswordById, setShowPasswordById] = useState<
    Record<string, boolean>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [testingPoolEntryId, setTestingPoolEntryId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setConfig(cloneProxyConfiguration(proxy));
  }, [proxy]);

  const usesLocalProxyTarget = scope === null || scope === 'client';

  const websitesWithAccounts = useMemo(() => {
    const websiteIds = new Set(accounts.map((account) => account.website));
    return websites
      .filter((website) => websiteIds.has(website.id))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [accounts, websites]);

  const routingChoiceOptions = useMemo(() => {
    const options = [
      { value: 'system', label: 'System proxy' },
      { value: 'direct', label: 'Direct (no proxy)' },
      ...config.pool.map((entry) => ({
        value: entry.id,
        label: poolEntryLabel(entry),
      })),
    ];

    return options;
  }, [config.pool]);

  const fixedProxyOptions = useMemo(
    () =>
      config.pool
        .filter((entry) => entry.host.trim() && entry.port.trim())
        .map((entry) => ({
          value: entry.id,
          label: poolEntryLabel(entry),
        })),
    [config.pool],
  );

  const validation = useMemo(() => validateProxyConfiguration(config), [config]);

  const isDirty =
    serializeProxyForCompare(config) !== serializeProxyForCompare(proxy);

  const canSave = isDirty && validation.ok;

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
      }

      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!validation.ok) {
      showConnectionErrorNotification(
        <Trans>Configuration Error</Trans>,
        validation.errors.join(' '),
      );
      return;
    }

    setIsSaving(true);
    try {
      const proxyPatch = buildProxyPatch(config);

      if (usesLocalProxyTarget) {
        await settingsApi.updateLocalSystemStartupSettings({
          proxy: proxyPatch,
        });
        resetGlobalProxyReadyCache();
        await window.electron?.applyProxyConfig();
      } else {
        await settingsApi.updateSystemStartupSettings({
          proxy: proxyPatch,
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
        ? await settingsApi.testLocalProxyConnection(payload)
        : await settingsApi.testProxyConnection(payload);

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
            Choose how PostyBirb routes HTTP traffic. Per-website routing uses
            an internal PAC script — you never configure domains manually.
          </Trans>
        </Text>

        <Stack gap="md">
          <Select
            label={<Trans>Routing mode</Trans>}
            data={PROXY_MODE_OPTIONS}
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
                          aria-label="Remove proxy"
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
                        data={PROXY_TYPE_OPTIONS}
                        value={entry.type}
                        onChange={(value) =>
                          updatePoolEntry(entry.id, {
                            type: (value as ProxyType) ?? 'http',
                          })
                        }
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
              placeholder="Select a pool entry"
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
                      const choice = config.routing[website.id] ?? 'system';
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

          {!validation.ok && isDirty && (
            <Alert color="red">
              {validation.errors.map((error) => (
                <Text key={error} size="sm">
                  {error}
                </Text>
              ))}
            </Alert>
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
              <Trans>
                Saved settings apply on this device right away. Reload any open
                login pages.
              </Trans>
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
