/**
 * Import Settings Section - Legacy data import from PostyBirb Plus.
 */

import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Checkbox, Stack, Text, Title } from '@mantine/core';
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import legacyImporterApi from '../../../../api/legacy-database-importer.api';

export function ImportSettingsSection() {
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<Error[]>([]);
  const [success, setSuccess] = useState(false);

  const [importOptions, setImportOptions] = useState({
    customShortcuts: true,
    tagGroups: true,
    accounts: true,
    tagConverters: true,
  });

  const handleImport = async () => {
    setImporting(true);
    setErrors([]);
    setSuccess(false);

    try {
      const result = await legacyImporterApi.import(importOptions);
      if (result.body.errors.length > 0) {
        setErrors(result.body.errors);
      } else {
        setSuccess(true);
      }
    } catch (error) {
      setErrors([error as Error]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Import from PostyBirb Plus</Trans>
        </Title>

        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Trans>
              Import your data from PostyBirb Plus. Select which types of data
              you want to import.
            </Trans>
          </Alert>

          <Stack gap="xs">
            <Checkbox
              label={<Trans>Custom Shortcuts</Trans>}
              checked={importOptions.customShortcuts}
              onChange={(event) =>
                setImportOptions({
                  ...importOptions,
                  customShortcuts: event.currentTarget.checked,
                })
              }
            />

            <Checkbox
              label={<Trans>Tag Groups</Trans>}
              checked={importOptions.tagGroups}
              onChange={(event) =>
                setImportOptions({
                  ...importOptions,
                  tagGroups: event.currentTarget.checked,
                })
              }
            />

            <Checkbox
              label={<Trans>Accounts</Trans>}
              checked={importOptions.accounts}
              onChange={(event) =>
                setImportOptions({
                  ...importOptions,
                  accounts: event.currentTarget.checked,
                })
              }
            />

            <Checkbox
              label={<Trans>Tag Converters</Trans>}
              checked={importOptions.tagConverters}
              onChange={(event) =>
                setImportOptions({
                  ...importOptions,
                  tagConverters: event.currentTarget.checked,
                })
              }
            />
          </Stack>

          <Button loading={importing} onClick={handleImport}>
            <Trans>Import</Trans>
          </Button>

          {success && (
            <Alert color="green" icon={<IconCheck size={16} />}>
              <Trans>Import completed successfully!</Trans>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert color="red" icon={<IconX size={16} />}>
              <Stack gap="xs">
                <Text fw={500}>
                  <Trans>Import encountered errors:</Trans>
                </Text>
                {errors.map((error, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Text key={index} size="sm">
                    {error.message}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
