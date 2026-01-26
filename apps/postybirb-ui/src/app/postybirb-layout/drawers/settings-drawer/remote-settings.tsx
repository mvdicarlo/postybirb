import { Trans } from '@lingui/react/macro';
import {
  Box,
  Button,
  Card,
  Divider,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RemoteConfig } from '@postybirb/utils/electron';
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
import { useLocalStorage } from '../../../../hooks/use-local-storage';
import { CommonTranslations } from '../../../../translations/common-translations';
import {
  REMOTE_HOST_KEY,
  REMOTE_MODE_KEY,
  REMOTE_PASSWORD_KEY,
} from '../../../../transports/http-client';

const LAN_IP_PLACEHOLDER = 'localhost:9487';

export function RemoteSettings() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig>({
    enabled: true,
    password: '',
  });
  const [lanIp, setLanIp] = useState<string>('');
  const [showLanIp, setShowLanIp] = useState(false);
  const [remoteMode, setRemoteMode] = useLocalStorage<'host' | 'client'>(
    REMOTE_MODE_KEY,
    'host',
  );
  const isHost = remoteMode === 'host';

  const [remotePassword, setRemotePassword] = useLocalStorage<string | null>(
    REMOTE_PASSWORD_KEY,
    null,
  );
  const [hostUrl, setHostUrl] = useLocalStorage<string | null>(
    REMOTE_HOST_KEY,
    null,
  );

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

    if (window.electron?.getRemoteConfig) {
      setRemoteConfig(window.electron.getRemoteConfig());
    }
  }, []);

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      await remoteApi.testPing();
      notifications.show({
        message: <Trans>Successfully connected to the remote host</Trans>,
        color: 'green',
      });
    } catch (error) {
      const err = error as {
        error: string;
        statusCode: number;
        message: string;
      };
      notifications.show({
        title: `${err.error} (${err.statusCode})`,
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
        <Divider />
        <Radio.Group
          label={<Trans>Remote Mode</Trans>}
          value={isHost ? 'host' : 'client'}
          onChange={(value) => setRemoteMode(value as 'host' | 'client')}
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

        {isHost ? (
          <TextInput
            label={<Trans>Remote Access Password</Trans>}
            description={
              <Trans>
                Password that remote clients will use to connect to this host
              </Trans>
            }
            type={showPassword ? 'text' : 'password'}
            value={remoteConfig.password}
            rightSection={
              <Button
                variant="subtle"
                size="xs"
                px={4}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <IconEyeOff size={16} />
                ) : (
                  <IconEye size={16} />
                )}
              </Button>
            }
          />
        ) : (
          <TextInput
            label={<Trans>Remote Access Password</Trans>}
            description={
              <Trans>
                Password provided by the host to connect to their instance
              </Trans>
            }
            type={showPassword ? 'text' : 'password'}
            value={remotePassword || ''}
            onChange={(event) => {
              setRemotePassword(event.currentTarget.value);
            }}
            required
            rightSection={
              <Button
                variant="subtle"
                size="xs"
                px={4}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <IconEyeOff size={16} />
                ) : (
                  <IconEye size={16} />
                )}
              </Button>
            }
          />
        )}

        {!isHost && (
          <>
            <TextInput
              label={<Trans>Host URL</Trans>}
              description={
                <Trans>
                  The URL of the PostyBirb host instance. Check the host's
                  remote settings to get the correct URL.
                </Trans>
              }
              value={hostUrl || ''}
              onChange={(event) => {
                setHostUrl(event.currentTarget.value);
              }}
              placeholder={LAN_IP_PLACEHOLDER}
              required
            />

            <Group justify="flex-end">
              <Button
                variant="outline"
                loading={isTestingConnection}
                disabled={!remotePassword || !hostUrl}
                onClick={testConnection}
                leftSection={<IconNetwork size={16} />}
              >
                <Trans>Test Connection</Trans>
              </Button>
              <Button
                onClick={() => {
                  setHostUrl(null);
                  setRemotePassword(null);
                }}
              >
                <CommonTranslations.Clear />
              </Button>
            </Group>
          </>
        )}

        {isHost && (
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
                  Share this URL with remote clients on your local network so
                  they can connect to this host:
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
                >
                  {showLanIp ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  px={4}
                  onClick={async () => {
                    await navigator.clipboard.writeText(lanIp);
                    notifications.show({
                      message: <CommonTranslations.CopiedToClipboard />,
                      color: 'green',
                    });
                  }}
                  tabIndex={-1}
                >
                  <IconCopy size={14} />
                </Button>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                <Trans>
                  If you need to connect from outside your local network you
                  will need to set up port forwarding on your router and use the
                  public IP of the host computer.
                </Trans>
              </Text>
            </Box>
          </>
        )}
      </Stack>
    </Card>
  );
}
