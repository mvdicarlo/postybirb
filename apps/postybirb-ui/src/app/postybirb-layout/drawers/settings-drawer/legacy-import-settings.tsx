import { Trans, useLingui } from '@lingui/react/macro';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Group,
    Stack,
    Text,
} from '@mantine/core';
import { IconDatabase, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import legacyImporterApi from '../../../../api/legacy-database-importer.api';

export function LegacyImportSettings() {
  const { t } = useLingui();
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
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconDatabase size={20} />
          <Text fw={500} size="lg">
            <Trans>Import from PostyBirb Plus</Trans>
          </Text>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Trans>
            Import your data from PostyBirb Plus. Select which types of data you
            want to import.
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

        <Button
          onClick={handleImport}
          loading={importing}
          disabled={
            !importOptions.customShortcuts &&
            !importOptions.tagGroups &&
            !importOptions.accounts &&
            !importOptions.tagConverters
          }
        >
          <Trans>Import</Trans>
        </Button>

        {success && (
          <Alert color="green">
            <Trans>Import completed successfully!</Trans>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert color="red" title={<Trans>Import Errors</Trans>}>
            <Stack gap="xs">
              {errors.map((error, index) => (
                <Text key={index} size="sm">
                  {error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
