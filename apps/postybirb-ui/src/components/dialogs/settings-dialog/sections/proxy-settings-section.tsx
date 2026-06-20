/**
 * Proxy Settings Section - Multi-profile proxy configuration.
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Group,
  Loader,
  MultiSelect,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import type {
  ProxyConfiguration,
  ProxyProfile,
  ProxyType,
} from '@postybirb/utils/common';
import {
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconPlug,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';
import { useWebsites } from '../../../../stores/entity/website-store';
import {
  showConnectionErrorNotification,
  showConnectionSuccessNotification,
} from '../../../../utils/notifications';

const PROXY_TYPE_OPTIONS: { value: ProxyType; label: string }[] = [
  { value: 'http', label: 'HTTP(S)' },
  { value: 'socks5', label: 'SOCKS5' },
];

function createEmptyProfile(): ProxyProfile {
  return {
    id: crypto.randomUUID(),
    enabled: false,
    label: '',
    type: 'http',
    host: '',
    port: '',
    username: '',
    password: '',
    websites: [],
  };
}

function cloneProfiles(profiles: ProxyProfile[]): ProxyProfile[] {
  return profiles.map((profile) => ({ ...profile, websites: [...profile.websites] }));
}

function getWebsiteOptionsForProfile(
  profiles: ProxyProfile[],
  profileId: string,
  websites: { id: string; displayName: string }[],
) {
  const assignedElsewhere = new Set<string>();
  for (const profile of profiles) {
    if (profile.id === profileId) {
      continue;
    }
    profile.websites.forEach((websiteId) => assignedElsewhere.add(websiteId));
  }

  const currentProfile = profiles.find((profile) => profile.id === profileId);
  const currentWebsites = new Set(currentProfile?.websites ?? []);

  return websites
    .filter(
      (website) =>
        currentWebsites.has(website.id) || !assignedElsewhere.has(website.id),
    )
    .map((website) => ({
      value: website.id,
      label: website.displayName,
    }));
}

export function ProxySettingsSection() {
  const {
    data: startupSettings,
    isLoading,
    refetch,
  } = useQuery(
    'startup-settings',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    { cacheTime: 0 },
  );

  if (isLoading) {
    return <Loader />;
  }

  const proxy =
    startupSettings?.proxy && Array.isArray(startupSettings.proxy.profiles)
      ? startupSettings.proxy
      : { profiles: [] };

  return <ProxySettingsForm proxy={proxy} refetch={refetch} />;
}

function ProxySettingsForm({
  proxy,
  refetch,
}: {
  proxy: ProxyConfiguration;
  refetch: () => Promise<unknown>;
}) {
  const websites = useWebsites();
  const [profiles, setProfiles] = useState<ProxyProfile[]>(() =>
    cloneProfiles(proxy.profiles),
  );
  const [showPasswordById, setShowPasswordById] = useState<
    Record<string, boolean>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [testingProfileId, setTestingProfileId] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return JSON.stringify(profiles) !== JSON.stringify(proxy.profiles);
  }, [profiles, proxy.profiles]);

  const canSave = useMemo(() => {
    if (!isDirty) {
      return false;
    }

    return profiles.every(
      (profile) =>
        !profile.enabled ||
        (profile.host.trim().length > 0 && profile.port.trim().length > 0),
    );
  }, [isDirty, profiles]);

  const updateProfile = (
    profileId: string,
    patch: Partial<ProxyProfile>,
  ): void => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, ...patch } : profile,
      ),
    );
  };

  const removeProfile = (profileId: string): void => {
    setProfiles((current) => current.filter((profile) => profile.id !== profileId));
  };

  const addProfile = (): void => {
    setProfiles((current) => [...current, createEmptyProfile()]);
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await settingsApi.updateSystemStartupSettings({
        proxy: {
          profiles: profiles.map((profile) => ({
            ...profile,
            label: profile.label?.trim() || undefined,
            host: profile.host.trim(),
            port: profile.port.trim(),
            username: profile.username.trim(),
          })),
        },
      });
      await refetch();
      showConnectionSuccessNotification(
        <Trans>Proxy settings saved and applied</Trans>,
      );
    } catch {
      showConnectionErrorNotification(
        <Trans>Failed to save proxy settings</Trans>,
        <Trans>Check that profiles are valid and websites are not duplicated</Trans>,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (profile: ProxyProfile): Promise<void> => {
    if (!profile.enabled) {
      return;
    }

    if (!profile.host.trim() || !profile.port.trim()) {
      showConnectionErrorNotification(
        <Trans>Configuration Error</Trans>,
        <Trans>Proxy host and port are required</Trans>,
      );
      return;
    }

    setTestingProfileId(profile.id);
    try {
      const result = await settingsApi.testProxyConnection({
        ...profile,
        host: profile.host.trim(),
        port: profile.port.trim(),
        username: profile.username.trim(),
        websiteId: profile.websites[0],
      });

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
      setTestingProfileId(null);
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Proxy</Trans>
        </Title>

        <Text size="sm" c="dimmed" mb="md">
          <Trans>
            Create proxy profiles and assign websites to each profile.
          </Trans>
        </Text>

        <Stack gap="md">
          {profiles.length === 0 && (
            <Alert color="gray">
              <Trans>
                No proxy profiles configured.
              </Trans>
            </Alert>
          )}

          {profiles.map((profile, index) => {
            const showPassword = showPasswordById[profile.id] ?? false;
            const websiteOptions = getWebsiteOptionsForProfile(
              profiles,
              profile.id,
              websites,
            );
            const showsTelegramHttpHint =
              profile.websites.includes('telegram') && profile.type === 'http';

            return (
              <Card key={profile.id} withBorder padding="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Text fw={600}>
                      <Trans>Profile {index + 1}</Trans>
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Remove profile"
                      onClick={() => removeProfile(profile.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>

                  <Switch
                    label={<Trans>Enable</Trans>}
                    checked={profile.enabled}
                    onChange={(event) =>
                      updateProfile(profile.id, {
                        enabled: event.currentTarget.checked,
                      })
                    }
                  />

                  <TextInput
                    label={<Trans>Label (optional)</Trans>}
                    value={profile.label ?? ''}
                    onChange={(event) =>
                      updateProfile(profile.id, {
                        label: event.currentTarget.value,
                      })
                    }
                  />

                  <Select
                    label={<Trans>Proxy type</Trans>}
                    data={PROXY_TYPE_OPTIONS}
                    value={profile.type}
                    onChange={(value) =>
                      updateProfile(profile.id, {
                        type: (value as ProxyType) ?? 'http',
                      })
                    }
                  />

                  {profile.enabled && (
                    <>
                      <Group grow align="flex-start">
                        <TextInput
                          label={<Trans>Host</Trans>}
                          leftSection={<IconPlug size={18} />}
                          placeholder="proxy.example.com"
                          value={profile.host}
                          onChange={(event) =>
                            updateProfile(profile.id, {
                              host: event.currentTarget.value,
                            })
                          }
                        />
                        <TextInput
                          label={<Trans>Port</Trans>}
                          placeholder="8080"
                          value={profile.port}
                          onChange={(event) =>
                            updateProfile(profile.id, {
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
                          value={profile.username}
                          onChange={(event) =>
                            updateProfile(profile.id, {
                              username: event.currentTarget.value,
                            })
                          }
                        />
                        <TextInput
                          label={<Trans>Password (optional)</Trans>}
                          type={showPassword ? 'text' : 'password'}
                          value={profile.password}
                          onChange={(event) =>
                            updateProfile(profile.id, {
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
                                  [profile.id]: !showPassword,
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
                    </>
                  )}

                  <MultiSelect
                    label={<Trans>Websites</Trans>}
                    placeholder={
                      profile.websites.length === 0 || !websiteOptions.length
                        ? 'All websites assigned'
                        : undefined
                    }
                    data={websiteOptions}
                    value={profile.websites}
                    searchable
                    onChange={(value) =>
                      updateProfile(profile.id, { websites: value })
                    }
                  />

                  {showsTelegramHttpHint && (
                    <Alert color="yellow">
                      <Stack gap={4}>
                        <Text size="sm">
                          <Trans>
                            Only SOCKS5 type or use POSTYBIRB_TELEGRAM_MTPROXY.
                          </Trans>
                        </Text>
                        <Text size="sm">
                          <Trans>
                            HTTP(S) profiles cannot be used for Teleproto.
                          </Trans>
                        </Text>
                      </Stack>
                    </Alert>
                  )}

                  {profile.enabled && (
                    <Button
                      variant="outline"
                      leftSection={<IconPlug size={16} />}
                      loading={testingProfileId === profile.id}
                      disabled={!profile.host.trim() || !profile.port.trim()}
                      onClick={() => testConnection(profile)}
                    >
                      <Trans>Test Connection</Trans>
                    </Button>
                  )}
                </Stack>
              </Card>
            );
          })}

          <Group>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={addProfile}
            >
              <Trans>Add profile</Trans>
            </Button>
          </Group>

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
            <Trans>
              Saved settings apply right away. Reload any open login pages.
            </Trans>
          </Alert>
        </Stack>
      </Box>
    </Stack>
  );
}
