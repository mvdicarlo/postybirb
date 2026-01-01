/**
 * Remote Settings Section - Remote connection configuration.
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    Button,
    Divider,
    Group,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {
    IconEye,
    IconEyeOff,
    IconNetwork,
    IconPlug,
    IconRouter,
    IconServer,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import remoteApi from '../../../../api/remote.api';
import {
    REMOTE_HOST_KEY,
    REMOTE_MODE_KEY,
    REMOTE_PASSWORD_KEY,
} from '../../../../transports/http-client';
import {
  showConnectionErrorNotification,
  showConnectionSuccessNotification,
} from '../../../../utils/notifications';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';

export function RemoteSettingsSection() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLanIp, setShowLanIp] = useState(false);
  const [lanIp, setLanIp] = useState<string>('localhost:9487');
  const [remoteConfig, setRemoteConfig] = useState({
    enabled: true,
    password: '',
  });

  // Local storage state
  const [remoteMode, setRemoteMode] = useState<'host' | 'client'>(
    () => (localStorage.getItem(REMOTE_MODE_KEY) as 'host' | 'client') || 'host',
  );
  const [remotePassword, setRemotePassword] = useState<string>(
    () => localStorage.getItem(REMOTE_PASSWORD_KEY) || '',
  );
  const [hostUrl, setHostUrl] = useState<string>(
    () => localStorage.getItem(REMOTE_HOST_KEY) || '',
  );

  const isHost = remoteMode === 'host';

  useEffect(() => {
    if (window.electron?.getLanIp) {
      window.electron
        .getLanIp()
        .then((ip) => {
          setLanIp(`${ip}:${window.electron.app_port}`);
        })
        .catch(() => {
          setLanIp('localhost:9487');
        });
    }

    if (window.electron?.getRemoteConfig) {
      setRemoteConfig(window.electron.getRemoteConfig());
    }
  }, []);

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      await remoteApi.testPing();
      showConnectionSuccessNotification(
        <Trans>Successfully connected to the remote host</Trans>
      );
    } catch (error) {
      const err = error as { error: string; status: number; message: string };
      showConnectionErrorNotification(
        `${err.error} (${err.status})`,
        err.message
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Remote Connection</Trans>
        </Title>

        <Stack gap="md">
          <Group>
            <Button
              variant={isHost ? 'filled' : 'outline'}
              leftSection={<IconServer size={16} />}
              onClick={() => {
                setRemoteMode('host');
                localStorage.setItem(REMOTE_MODE_KEY, 'host');
              }}
            >
              <Trans>Host</Trans>
            </Button>
            <Button
              variant={!isHost ? 'filled' : 'outline'}
              leftSection={<IconNetwork size={16} />}
              onClick={() => {
                setRemoteMode('client');
                localStorage.setItem(REMOTE_MODE_KEY, 'client');
              }}
            >
              <Trans>Client</Trans>
            </Button>
          </Group>

          <Divider />

          {isHost ? (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                <Trans>
                  Share your LAN IP and password with clients to allow them to
                  connect.
                </Trans>
              </Text>

              <Group align="flex-end">
                <TextInput
                  label={<Trans>LAN IP</Trans>}
                  leftSection={<IconPlug size={18} />}
                  value={showLanIp ? lanIp : '•••••••••••'}
                  readOnly
                  style={{ flex: 1 }}
                  rightSection={
                    <Group gap={4}>
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() => setShowLanIp(!showLanIp)}
                      >
                        {showLanIp ? (
                          <IconEyeOff size={16} />
                        ) : (
                          <IconEye size={16} />
                        )}
                      </Button>
                      <CopyToClipboard value={lanIp} size="xs" />
                    </Group>
                  }
                  rightSectionWidth={80}
                />
              </Group>

              <Group align="flex-end">
                <TextInput
                  label={<Trans>Password</Trans>}
                  leftSection={<IconRouter size={18} />}
                  value={showPassword ? remoteConfig.password : '•••••••••••'}
                  readOnly
                  style={{ flex: 1 }}
                  rightSection={
                    <Group gap={4}>
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <IconEyeOff size={16} />
                        ) : (
                          <IconEye size={16} />
                        )}
                      </Button>
                      <CopyToClipboard value={remoteConfig.password} size="xs" />
                    </Group>
                  }
                  rightSectionWidth={80}
                />
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                <Trans>
                  Enter the host URL and password to connect to a remote
                  PostyBirb instance.
                </Trans>
              </Text>

              <TextInput
                label={<Trans>Host URL</Trans>}
                leftSection={<IconPlug size={18} />}
                placeholder="192.168.1.100:9487"
                value={hostUrl}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setHostUrl(value);
                  localStorage.setItem(REMOTE_HOST_KEY, value);
                }}
              />

              <TextInput
                label={<Trans>Password</Trans>}
                leftSection={<IconRouter size={18} />}
                type={showPassword ? 'text' : 'password'}
                value={remotePassword}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setRemotePassword(value);
                  localStorage.setItem(REMOTE_PASSWORD_KEY, value);
                }}
                rightSection={
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <IconEyeOff size={16} />
                    ) : (
                      <IconEye size={16} />
                    )}
                  </Button>
                }
              />

              <Button
                leftSection={<IconPlug size={16} />}
                loading={isTestingConnection}
                onClick={testConnection}
              >
                <Trans>Test Connection</Trans>
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
