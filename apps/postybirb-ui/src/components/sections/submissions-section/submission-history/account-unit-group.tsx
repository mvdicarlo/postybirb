/**
 * AccountUnitGroup - Accordion item showing every unit of work posted to a single account.
 */

import { Trans } from '@lingui/react/macro';
import {
    Accordion,
    Badge,
    Group,
    Stack,
    Table,
    Text,
    Tooltip,
} from '@mantine/core';
import { EntityId, IUnitOfWork, UnitOfWorkState } from '@postybirb/types';
import { IconExternalLink, IconInfoCircle } from '@tabler/icons-react';
import { useLocale } from '../../../../hooks';
import type { AccountRecord, SubmissionRecord } from '../../../../stores/records';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';
import { ExternalLink } from '../../../shared/external-link';
import {
    getAccountUnitCounts,
    getUnitErrorMessages,
    getUnitFileName,
    getUnitStateInfo,
} from './history-utils';

interface AccountUnitGroupProps {
  accountId: EntityId;
  units: IUnitOfWork[];
  submission: SubmissionRecord;
  account: AccountRecord | undefined;
}

function UnitStateCell({ unit }: { unit: IUnitOfWork }) {
  const { formatRelativeTime } = useLocale();
  const stateInfo = getUnitStateInfo(unit.state);
  const isRateLimited =
    unit.state === UnitOfWorkState.RATE_LIMITED && unit.rateLimitedUntil;
  const retryTime = unit.rateLimitedUntil
    ? formatRelativeTime(unit.rateLimitedUntil)
    : '';

  return (
    <Stack gap={2}>
      <Badge size="sm" variant="light" color={stateInfo.color}>
        {stateInfo.label}
      </Badge>
      {isRateLimited ? (
        <Text size="xs" c="dimmed">
          <Trans>Retries {retryTime}</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

function UnitDetailsCell({ unit }: { unit: IUnitOfWork }) {
  const errors = getUnitErrorMessages(unit);

  if (errors.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        -
      </Text>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip
        multiline
        w={320}
        label={
          <Stack gap={2}>
            {errors.map((error) => (
              <Text key={error} size="xs">
                {error}
              </Text>
            ))}
          </Stack>
        }
      >
        <IconInfoCircle size={16} color="var(--mantine-color-red-5)" />
      </Tooltip>
      <CopyToClipboard
        value={JSON.stringify(unit.response ?? {}, null, 2)}
        size="xs"
        tooltipPosition="top"
      />
    </Group>
  );
}

/**
 * Displays one account's units of work as an Accordion.Item.
 */
export function AccountUnitGroup({
  accountId,
  units,
  submission,
  account,
}: AccountUnitGroupProps) {
  const { succeeded, failed, running, pending, evicted } =
    getAccountUnitCounts(units);

  return (
    <Accordion.Item value={accountId}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" pr="xs">
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {account?.websiteDisplayName ?? <Trans>Unknown website</Trans>}
            </Text>
            <Text size="xs" c="dimmed">
              {account?.name ?? accountId}
            </Text>
          </Stack>
          <Group gap="xs" wrap="nowrap">
            {succeeded > 0 && (
              <Badge size="sm" variant="light" color="green">
                <Trans>{succeeded} succeeded</Trans>
              </Badge>
            )}
            {failed > 0 && (
              <Badge size="sm" variant="light" color="red">
                <Trans>{failed} failed</Trans>
              </Badge>
            )}
            {running > 0 && (
              <Badge size="sm" variant="light" color="blue">
                <Trans>{running} running</Trans>
              </Badge>
            )}
            {pending > 0 && (
              <Badge size="sm" variant="light" color="gray">
                <Trans>{pending} waiting</Trans>
              </Badge>
            )}
            {evicted > 0 && (
              <Badge size="sm" variant="outline" color="gray">
                <Trans>{evicted} superseded</Trans>
              </Badge>
            )}
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Trans>File</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Status</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Attempt</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Source URL</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Details</Trans>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {units.map((unit) => {
              const fileName = getUnitFileName(submission, unit);
              return (
                <Table.Tr
                  key={unit.id}
                  style={unit.evicted ? { opacity: 0.55 } : undefined}
                >
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" truncate maw={220}>
                        {fileName ?? <Trans>Message</Trans>}
                      </Text>
                      {unit.evicted && (
                        <Badge size="xs" variant="outline" color="gray">
                          <Trans>Superseded</Trans>
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <UnitStateCell unit={unit} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c={unit.attempt > 0 ? undefined : 'dimmed'}>
                      {unit.attempt + 1}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {unit.url ? (
                      <ExternalLink href={unit.url}>
                        <Group gap={4} wrap="nowrap">
                          <Text size="xs" c="blue.6" td="underline">
                            <Trans>View</Trans>
                          </Text>
                          <IconExternalLink size="0.75rem" />
                        </Group>
                      </ExternalLink>
                    ) : (
                      <Text size="xs" c="dimmed">
                        -
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <UnitDetailsCell unit={unit} />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
