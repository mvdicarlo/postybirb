/**
 * AccountUnitGroup - Accordion item showing every unit of work posted to a single account.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Accordion,
  ActionIcon,
  Avatar,
  Badge,
  Code,
  Collapse,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { EntityId, IUnitOfWork, UnitOfWorkState } from '@postybirb/types';
import {
  IconAlertCircle,
  IconChevronDown,
  IconCode,
  IconExternalLink,
  IconFile,
  IconHistory,
  IconMessage,
  IconRefresh,
} from '@tabler/icons-react';
import { useId, useState } from 'react';
import postingApi from '../../../../api/posting.api';
import { useLocale } from '../../../../hooks';
import type {
  AccountRecord,
  SubmissionRecord,
} from '../../../../stores/records';
import { getBaseUrl } from '../../../../transports/http-client';
import { showErrorNotification } from '../../../../utils/notifications';
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
    <Stack gap={3} align="flex-start">
      <Badge
        size="sm"
        radius="sm"
        tt="none"
        variant="light"
        color={stateInfo.color}
      >
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

function UnitEvictCell({ unit }: { unit: IUnitOfWork }) {
  const [isEvicting, setIsEvicting] = useState(false);
  const { t } = useLingui();

  // Evicting mid-flight would race the worker writing the unit's result.
  const isInFlight =
    unit.state === UnitOfWorkState.EXECUTING ||
    unit.state === UnitOfWorkState.VALIDATING;

  if (unit.evicted || unit.state === UnitOfWorkState.FAILED) {
    return null;
  }

  const handleEvict = async () => {
    setIsEvicting(true);
    try {
      await postingApi.evictUnitOfWork(unit.id);
    } catch {
      showErrorNotification(<Trans>Unable to evict this work</Trans>);
    } finally {
      setIsEvicting(false);
    }
  };

  return (
    <Tooltip
      label={
        isInFlight ? (
          <Trans>Cannot evict work that is currently posting</Trans>
        ) : (
          <Trans>Evict so this is posted again on the next attempt</Trans>
        )
      }
    >
      <ActionIcon
        variant="subtle"
        size={30}
        color="orange"
        loading={isEvicting}
        aria-label={t`Repost on next attempt`}
        aria-disabled={isInFlight}
        data-disabled={isInFlight || undefined}
        onClick={isInFlight ? undefined : handleEvict}
      >
        <IconRefresh size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

function UnitHistoryRow({
  unit,
  submission,
}: {
  unit: IUnitOfWork;
  submission: SubmissionRecord;
}) {
  const { t } = useLingui();
  const { formatDateTime } = useLocale();
  const [detailsOpened, setDetailsOpened] = useState(false);
  const responseId = useId();
  const file = submission.files.find((entry) => entry.id === unit.fileId);
  const fileName = getUnitFileName(submission, unit);
  const errors =
    unit.state === UnitOfWorkState.FAILED ? getUnitErrorMessages(unit) : [];
  const hasResponse = unit.response && Object.keys(unit.response).length > 0;
  const canEvict = !unit.evicted && unit.state !== UnitOfWorkState.FAILED;

  return (
    <div
      role="listitem"
      className="post-history-unit"
      data-evicted={unit.evicted || undefined}
    >
      <div className="post-history-unit-main">
        <Avatar
          size={36}
          radius={4}
          color="gray"
          src={
            file
              ? `${getBaseUrl()}/api/file/thumbnail/${file.id}?${file.hash}`
              : undefined
          }
          alt={fileName ?? ''}
          imageProps={{ loading: 'lazy' }}
          className="post-history-unit-preview"
        >
          {unit.fileId ? (
            <IconFile size={18} stroke={1.5} />
          ) : (
            <IconMessage size={18} stroke={1.5} />
          )}
        </Avatar>
        <div className="post-history-unit-body">
          <div className="post-history-unit-heading">
            <Text size="sm" fw={500} className="post-history-unit-name">
              {fileName ??
                (unit.fileId ? (
                  <Trans>Removed file</Trans>
                ) : (
                  <Trans>Message</Trans>
                ))}
            </Text>
            <UnitStateCell unit={unit} />
          </div>
          <Group gap="xs" mt={4} className="post-history-unit-meta">
            <Text size="xs" c="dimmed">
              <Trans>Attempt {unit.attempt + 1}</Trans>
            </Text>
            <Text
              size="xs"
              c="dimmed"
              component="time"
              dateTime={unit.updatedAt}
            >
              {formatDateTime(unit.updatedAt)}
            </Text>
            {unit.evicted && (
              <Badge
                size="xs"
                radius="sm"
                tt="none"
                variant="outline"
                color="gray"
              >
                <Trans>Superseded</Trans>
              </Badge>
            )}
          </Group>
          {errors.length > 0 && (
            <div className="post-history-unit-error">
              <IconAlertCircle size={14} />
              <Text size="xs">{errors.join('; ')}</Text>
            </div>
          )}
          {(unit.url || hasResponse || canEvict) && (
            <Group justify="space-between" gap="xs" mt={6}>
              {unit.url && (
                <ExternalLink
                  href={unit.url}
                  className="post-history-source-link"
                >
                  <Group gap={4} wrap="nowrap">
                    <IconExternalLink size={13} />
                    <Text size="xs" component="span">
                      <Trans>View post</Trans>
                    </Text>
                  </Group>
                </ExternalLink>
              )}
              <Group gap={2} ml="auto" wrap="nowrap">
                {hasResponse && (
                  <Tooltip
                    label={
                      detailsOpened ? (
                        <Trans>Hide response</Trans>
                      ) : (
                        <Trans>View response</Trans>
                      )
                    }
                  >
                    <ActionIcon
                      size={30}
                      variant={detailsOpened ? 'light' : 'subtle'}
                      color="gray"
                      aria-label={
                        detailsOpened ? t`Hide response` : t`View response`
                      }
                      aria-expanded={detailsOpened}
                      aria-controls={responseId}
                      onClick={() => setDetailsOpened((opened) => !opened)}
                    >
                      <IconCode size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <UnitEvictCell unit={unit} />
              </Group>
            </Group>
          )}
        </div>
      </div>
      {hasResponse && (
        <Collapse in={detailsOpened}>
          <div id={responseId} className="post-history-unit-details">
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={500} c="dimmed">
                <Trans>Website response</Trans>
              </Text>
              <CopyToClipboard
                value={JSON.stringify(unit.response, null, 2)}
                variant="button"
                size="xs"
              />
            </Group>
            <Code
              block
              className="post-history-response"
              tabIndex={0}
              aria-label={t`Website response`}
            >
              {JSON.stringify(unit.response, null, 2)}
            </Code>
          </div>
        </Collapse>
      )}
    </div>
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
  const { succeeded, evicted } = getAccountUnitCounts(units);
  const activeUnits = units.filter((unit) => !unit.evicted);
  const previousUnits = units.filter((unit) => unit.evicted);
  const currentState = [
    UnitOfWorkState.FAILED,
    UnitOfWorkState.EXECUTING,
    UnitOfWorkState.VALIDATING,
    UnitOfWorkState.RATE_LIMITED,
    UnitOfWorkState.PENDING,
    UnitOfWorkState.NEW,
    UnitOfWorkState.CANCELLED,
    UnitOfWorkState.SUCCEEDED,
  ].find((state) => activeUnits.some((unit) => unit.state === state));
  const stateInfo =
    currentState === undefined ? undefined : getUnitStateInfo(currentState);
  const total = activeUnits.length;
  const websiteName = account?.websiteDisplayName;

  return (
    <Accordion.Item value={accountId}>
      <Accordion.Control className="post-history-account-control">
        <div className="post-history-account-overview">
          <div className="post-history-account-identity">
            <Avatar
              size={34}
              radius="sm"
              color="gray"
              name={websiteName?.substring(0, 2)}
              aria-hidden
            />
            <div className="post-history-account-names">
              <Text size="sm" fw={600}>
                {websiteName ?? <Trans>Unknown website</Trans>}
              </Text>
              <Text size="xs" c="dimmed">
                {account?.name ?? accountId}
              </Text>
            </div>
          </div>
          <div className="post-history-account-outcomes">
            {stateInfo && (
              <Badge
                size="sm"
                radius="sm"
                tt="none"
                variant="light"
                color={stateInfo.color}
              >
                {stateInfo.label}
              </Badge>
            )}
            {total > 0 && (
              <Text size="xs" c="dimmed">
                <Trans>
                  {succeeded} of {total} succeeded
                </Trans>
              </Text>
            )}
          </div>
        </div>
      </Accordion.Control>
      <Accordion.Panel classNames={{ content: 'post-history-account-content' }}>
        <div role="list">
          {activeUnits.map((unit) => (
            <UnitHistoryRow key={unit.id} unit={unit} submission={submission} />
          ))}
        </div>
        {evicted > 0 && (
          <details
            className="post-history-previous"
            open={activeUnits.length === 0 || undefined}
          >
            <summary>
              <IconHistory size={14} />
              <Text size="xs" component="span">
                <Trans>Previous attempts ({evicted})</Trans>
              </Text>
              <IconChevronDown
                size={14}
                className="post-history-previous-chevron"
              />
            </summary>
            <div role="list">
              {previousUnits.map((unit) => (
                <UnitHistoryRow
                  key={unit.id}
                  unit={unit}
                  submission={submission}
                />
              ))}
            </div>
          </details>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
