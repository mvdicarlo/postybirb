import { Trans } from '@lingui/react/macro';
import { Button, Drawer, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { ComponentErrorBoundary } from '../../../../components/error-boundary';
import {
  getOverlayOffset,
  getPortalTarget,
  marginOffset,
} from '../drawer.util';
import { useDrawerToggle } from '../use-drawer-toggle';

export function MigrationDrawer() {
  const [visible, toggle] = useDrawerToggle('dataMigrationVisible');
  const [migrationStarted, setMigrationStarted] = useState(false);

  return (
    <ComponentErrorBoundary>
      <Drawer
        className="data-migration"
        closeOnClickOutside
        size="lg"
        ml={-marginOffset}
        portalProps={{
          target: getPortalTarget(),
        }}
        overlayProps={{
          left: getOverlayOffset(),
          zIndex: 100,
        }}
        trapFocus
        opened={visible}
        onClose={() => {
          toggle(true);
        }}
        title={
          <Text fw="bold" size="1.2rem">
            <Trans>Data migration</Trans>
          </Text>
        }
        styles={{
          body: {
            height: 'calc(100% - 60px)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {migrationStarted ? (
          <MigrationStatus stop={() => setMigrationStarted(false)} />
        ) : (
          <AskForMigration
            migrate={() => setMigrationStarted(true)}
            later={() => toggle()}
          />
        )}
      </Drawer>
    </ComponentErrorBoundary>
  );
}

function AskForMigration({
  migrate,
  later,
}: {
  migrate: () => void;
  later: () => void;
}) {
  return (
    <Stack gap="md">
      <ScrollArea.Autosize mah={320} type="always">
        <Stack gap="sm">
          <Text size="sm">
            <Trans>
              You have data from the old V3 folder. Would you like to migrate it
              to the current version?
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>
              V3 Data will be left as is. You still will be able to use old
              version if you want.
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>
              You can migrate your data at any time form the left drawer menu
            </Trans>
          </Text>
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="space-between" mt="sm">
        <Button color="blue" onClick={migrate}>
          <Trans>Migrate my data</Trans>
        </Button>
      </Group>
    </Stack>
  );
}

function MigrationStatus({ stop }: { stop: () => void }) {
  return (
    <Stack gap="md">
      <ScrollArea.Autosize mah={320} type="always">
        <Stack gap="sm">
          <Text size="sm">
            <Trans>Status</Trans>
          </Text>
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="space-between" mt="sm">
        <Button color="teal" onClick={stop}>
          <Trans>Stop migration</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
