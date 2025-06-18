import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
    Box,
    Button,
    Card,
    Divider,
    Group,
    Radio,
    Stack,
    Switch,
    Text,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCopy,
    IconEye,
    IconEyeOff,
    IconNetwork,
    IconPlug,
    IconRouter,
    IconServer,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import remoteApi from '../../../../api/remote.api';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores/use-settings';

const LAN_IP_PLACEHOLDER = 'localhost:9487';

export function RemoteSettings() {
  const { _ } = useLingui();
  const { settingsId, settings } = useSettings();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lanIp, setLanIp] = useState<string>('');
  const [showLanIp, setShowLanIp] = useState(false);
  const remoteSettings = settings?.remoteSettings || {
    isEnabled: false,
    isHost: true,
    password: '',
    hostUrl: '',
  };

  useEffect(() => {
    if (window.electron?.getLanIp) {
      window.electron
        .getLanIp()
        .then((ip) => {
          setLanIp(`${ip}:${window.electron.app_port}` || LAN_IP_PLACEHOLDER);
        })
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error(error);
          setLanIp(LAN_IP_PLACEHOLDER); // Fallback if unable to get LAN IP
        });
    }

    setLanIp(LAN_IP_PLACEHOLDER);
  }, []);

  const updateRemoteSettings = (updates: Partial<typeof remoteSettings>) => {
    const updatedRemoteSettings = {
      ...remoteSettings,
      ...updates,
    };

    settingsApi.update(settingsId, {
      settings: {
        ...settings,
        remoteSettings: updatedRemoteSettings,
      },
    });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      await remoteApi.testPing(remoteSettings);
      notifications.show({
        title: _(msg`Success`),
        message: _(msg`Successfully connected to the remote host`),
        color: 'green',
      });
    } catch (error) {
      const err = error as { error: string; status: number; message: string };
      notifications.show({
        title: `${err.error} (${err.status})`,
        message: err.message,
        color: 'red',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconRouter size={20} />
          <Text fw={500} size="lg">
            <Trans>Remote Access Settings</Trans>
          </Text>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Switch
          label={<Trans>Enable remote access</Trans>}
          description={
            <Trans>
              Allow this PostyBirb instance to be controlled remotely or connect
              to another instance
            </Trans>
          }
          checked={remoteSettings.isEnabled}
          onChange={(event) => {
            updateRemoteSettings({ isEnabled: event.currentTarget.checked });
          }}
        />

        {remoteSettings.isEnabled && (
          <>
            <Divider />

            <Radio.Group
              label={<Trans>Remote Mode</Trans>}
              description={
                <Trans>Choose how this PostyBirb instance should operate</Trans>
              }
              value={remoteSettings.isHost ? 'host' : 'client'}
              onChange={(value) =>
                updateRemoteSettings({ isHost: value === 'host' })
              }
            >
              <Stack gap="xs" mt="xs">
                <Radio
                  value="host"
                  label={
                    <Group gap="xs">
                      <IconServer size={16} />
                      <Text>
                        <Trans>Host Mode</Trans>
                      </Text>
                    </Group>
                  }
                  description={
                    <Trans>
                      Allow other PostyBirb instances to connect to this one
                    </Trans>
                  }
                />
                <Radio
                  value="client"
                  label={
                    <Group gap="xs">
                      <IconPlug size={16} />
                      <Text>
                        <Trans>Client Mode</Trans>
                      </Text>
                    </Group>
                  }
                  description={
                    <Trans>
                      Connect to another PostyBirb instance as a remote client
                    </Trans>
                  }
                />
              </Stack>
            </Radio.Group>

            <TextInput
              label={<Trans>Remote Access Password</Trans>}
              description={
                remoteSettings.isHost ? (
                  <Trans>
                    Password that remote clients will use to connect to this
                    host
                  </Trans>
                ) : (
                  <Trans>
                    Password provided by the host to connect to their instance
                  </Trans>
                )
              }
              type={showPassword ? 'text' : 'password'}
              value={remoteSettings.password}
              onChange={(event) => {
                updateRemoteSettings({ password: event.currentTarget.value });
              }}
              placeholder={_(msg`Enter a secure password`)}
              required
              rightSection={
                <Button
                  variant="subtle"
                  size="xs"
                  px={4}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <IconEyeOff size={16} />
                  ) : (
                    <IconEye size={16} />
                  )}
                </Button>
              }
            />

            {!remoteSettings.isHost && (
              <>
                <TextInput
                  label={<Trans>Host URL</Trans>}
                  description={
                    <Trans>
                      The URL of the PostyBirb host instance. Check the host's
                      remote settings to get the correct URL.
                    </Trans>
                  }
                  value={remoteSettings.hostUrl}
                  onChange={(event) => {
                    updateRemoteSettings({
                      hostUrl: event.currentTarget.value,
                    });
                  }}
                  placeholder={LAN_IP_PLACEHOLDER}
                  required
                />

                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    loading={isTestingConnection}
                    disabled={!remoteSettings.password}
                    onClick={testConnection}
                    leftSection={<IconNetwork size={16} />}
                  >
                    <Trans>Test Connection</Trans>
                  </Button>
                  <Button
                    variant="outline"
                    color="blue"
                    onClick={() => {
                      const currentRemoteUrl =
                        localStorage.getItem('remote_url');
                      if (currentRemoteUrl) {
                        localStorage.removeItem('remote_url');
                        localStorage.removeItem('remote_password');
                      } else {
                        localStorage.setItem(
                          'remote_url',
                          remoteSettings.hostUrl ?? '',
                        );
                        localStorage.setItem(
                          'remote_password',
                          remoteSettings.password ?? '',
                        );
                      }
                      window.location.reload();
                    }}
                  >
                    {localStorage.getItem('remote_url') ? (
                      <Trans>Unset</Trans>
                    ) : (
                      <Trans>Set</Trans>
                    )}
                  </Button>
                </Group>
              </>
            )}

            {remoteSettings.isHost && (
              <>
                <Divider />
                <Box
                  p="sm"
                  bg="var(--mantine-color-blue-light)"
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    // eslint-disable-next-line lingui/no-unlocalized-strings
                    border: '1px solid var(--mantine-color-blue-light-border)',
                  }}
                >
                  <Text size="sm" fw={500} mb="xs" c="blue">
                    <Trans>Connection Information</Trans>
                  </Text>
                  <Text size="xs" c="dimmed" mb="xs">
                    <Trans>
                      Share this URL with remote clients on your local network
                      so they can connect to this host:
                    </Trans>
                  </Text>
                  <Group gap={4} align="center" wrap="nowrap">
                    <Text
                      size="sm"
                      ff="monospace"
                      c="blue"
                      fw={500}
                      p="xs"
                      bg="var(--mantine-color-body)"
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                        border:
                          // eslint-disable-next-line lingui/no-unlocalized-strings
                          '1px solid var(--mantine-color-blue-light-border)',
                        wordBreak: 'break-all',
                        filter: showLanIp ? 'none' : 'blur(6px)',
                        userSelect: showLanIp ? 'text' : 'none',
                        position: 'relative',
                        display: 'inline-block',
                        minWidth: '180px',
                        marginRight: 8,
                      }}
                    >
                      {lanIp}
                    </Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      px={4}
                      onClick={() => setShowLanIp((v) => !v)}
                      tabIndex={-1}
                      aria-label={
                        showLanIp ? _(msg`Hide LAN IP`) : _(msg`Show LAN IP`)
                      }
                    >
                      {showLanIp ? (
                        <IconEyeOff size={14} />
                      ) : (
                        <IconEye size={14} />
                      )}
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      px={4}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(lanIp);
                          notifications.show({
                            title: _(msg`Copied`),
                            message: _(msg`LAN IP copied to clipboard`),
                            color: 'green',
                          });
                        } catch {
                          notifications.show({
                            title: _(msg`Copy failed`),
                            message: _(msg`Could not copy LAN IP`),
                            color: 'red',
                          });
                        }
                      }}
                      tabIndex={-1}
                      aria-label={_(msg`Copy LAN IP`)}
                    >
                      <IconCopy size={14} />
                    </Button>
                  </Group>
                  <Text size="xs" c="dimmed" mt="xs">
                    <Trans>
                      Note: If you need to connect from outside your local
                      network you will need to set up port forwarding on your
                      router and use the public IP of the host computer.
                    </Trans>
                  </Text>
                </Box>
              </>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}
