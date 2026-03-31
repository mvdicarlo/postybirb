/**
 * Remote Settings Section - Remote connection configuration.
 */

import { t } from '@lingui/core/macro';
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
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconNetwork,
  IconPlug,
  IconRefresh,
  IconRouter,
  IconServer,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import {
  REMOTE_HOST_KEY,
  REMOTE_MODE_KEY,
  REMOTE_PASSWORD_KEY,
} from '../../../../transports/http-client';
import {
  showConnectionErrorNotification,
  showConnectionSuccessNotification,
} from '../../../../utils/notifications';
import { ConfirmActionModal } from '../../../confirm-action-modal/confirm-action-modal';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';

export function RemoteSettingsSection() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionValid, setIsConnectionValid] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLanIp, setShowLanIp] = useState(false);
  const [lanIp, setLanIp] = useState<string>('localhost:9487');
  const [remoteConfig, setRemoteConfig] = useState({
    enabled: true,
    password: '',
  });

  // Local storage state
  const [remoteMode, setRemoteMode] = useState<'host' | 'client'>(
    () =>
      (localStorage.getItem(REMOTE_MODE_KEY) as 'host' | 'client') || 'host',
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
    if (!hostUrl?.trim()) {
      showConnectionErrorNotification(
        <Trans>Configuration Error</Trans>,
        <Trans>Remote host URL is not configured</Trans>,
      );
      return;
    }

    if (!remotePassword?.trim()) {
      showConnectionErrorNotification(
        <Trans>Configuration Error</Trans>,
        <Trans>Remote password is not configured</Trans>,
      );
      return;
    }

    setIsTestingConnection(true);
    setIsConnectionValid(false);

    try {
      const url = `https://${hostUrl.trim()}/api/remote/ping/${encodeURIComponent(remotePassword.trim())}`;
      const res = await fetch(url);
      const response = await res.json();

      if (!res.ok) {
        const errorInfo = {
          error: response.error || t`Connection Failed`,
          statusCode: response.statusCode || res.status,
          message: response.message || t`Failed to connect to remote host`,
        };
        showConnectionErrorNotification(
          `${errorInfo.error} (${errorInfo.statusCode})`,
          errorInfo.message,
        );
        return;
      }

      setIsConnectionValid(true);
      showConnectionSuccessNotification(
        <Trans>Successfully connected to the remote host</Trans>,
      );
    } catch (error) {
      if (error instanceof TypeError) {
        showConnectionErrorNotification(
          <Trans>Server unreachable</Trans>,
          <Trans>Ensure the IP is correct</Trans>,
        );
      } else {
        const err = error as {
          error: string;
          statusCode: number;
          message: string;
        };
        showConnectionErrorNotification(
          `${err.error} (${err.statusCode})`,
          err.message,
        );
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveClientSettings = () => {
    localStorage.setItem(REMOTE_HOST_KEY, hostUrl.trim());
    localStorage.setItem(REMOTE_PASSWORD_KEY, remotePassword.trim());
    window.location.reload();
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    localStorage.removeItem(REMOTE_MODE_KEY);
    localStorage.removeItem(REMOTE_HOST_KEY);
    localStorage.removeItem(REMOTE_PASSWORD_KEY);
    window.location.reload();
  };

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" mb="md">
          <Title order={4}>
            <Trans>Remote Connection</Trans>
          </Title>
          <Button
            variant="subtle"
            color="red"
            size="compact-sm"
            leftSection={<IconRefresh size={14} />}
            onClick={handleReset}
          >
            <Trans>Reset</Trans>
          </Button>
        </Group>

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
                      <CopyToClipboard
                        value={remoteConfig.password}
                        size="xs"
                      />
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
                  setIsConnectionValid(false);
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
                  setIsConnectionValid(false);
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

              <Group>
                <Button
                  leftSection={<IconPlug size={16} />}
                  loading={isTestingConnection}
                  onClick={testConnection}
                  disabled={!hostUrl?.trim() || !remotePassword?.trim()}
                >
                  <Trans>Test Connection</Trans>
                </Button>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  color="green"
                  disabled={!isConnectionValid}
                  onClick={handleSaveClientSettings}
                >
                  <Trans>Save</Trans>
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Box>

      <ConfirmActionModal
        opened={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={confirmReset}
        title={<Trans>Reset Remote Settings</Trans>}
        message={
          <Trans>
            Are you sure you want to reset all remote connection settings to
            their defaults? This will clear the saved host URL and password.
          </Trans>
        }
        confirmLabel={<Trans>Reset</Trans>}
        confirmColor="red"
      />
    </Stack>
  );
}
