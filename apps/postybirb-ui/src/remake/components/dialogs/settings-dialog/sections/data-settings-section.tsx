/**
 * Data Settings Section - Download logs and manage application data.
 */

/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Stack, Text, Title } from '@mantine/core';
import { IconDownload, IconInfoCircle, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import {
    defaultTargetProvider,
    getRemotePassword,
} from '../../../../transports/http-client';

export function DataSettingsSection() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadLogs = async () => {
    setDownloading(true);
    setError(null);

    try {
      const url = new URL('api/logs/download', defaultTargetProvider());
      const headers: Record<string, string> = {};
      const pw = getRemotePassword();
      if (pw) {
        headers['X-Remote-Password'] = pw;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;

      // Extract filename from Content-Disposition header, or use a default
      const disposition = response.headers.get('Content-Disposition');
      const fileNameMatch = disposition?.match(/filename=(.+)/);
      anchor.download = fileNameMatch
        ? fileNameMatch[1]
        : `postybirb-logs-${new Date().toISOString().split('T')[0]}.tar.gz`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Logs</Trans>
        </Title>

        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Trans>
              Download application logs as a compressed archive. This is useful
              for troubleshooting issues or sharing logs with developers.
            </Trans>
          </Alert>

          <Button
            leftSection={<IconDownload size={16} />}
            loading={downloading}
            onClick={handleDownloadLogs}
          >
            <Trans>Download Logs</Trans>
          </Button>

          {error && (
            <Alert color="red" icon={<IconX size={16} />}>
              <Text size="sm">{error}</Text>
            </Alert>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
