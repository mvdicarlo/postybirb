/**
 * ValidationIssuesPanel - Panel showing submissions with validation errors/warnings.
 * Helps users quickly identify and fix issues before posting.
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconExclamationCircle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useSubmissionsWithErrors } from '../../../stores/submission-store';
import { EmptyState } from '../../empty-state';

/**
 * ValidationIssuesPanel component.
 * Shows submissions that have validation errors or warnings.
 */
export function ValidationIssuesPanel() {
  const submissionsWithErrors = useSubmissionsWithErrors();

  const issues = useMemo(
    () =>
      submissionsWithErrors
        .filter((s) => !s.isTemplate && !s.isArchived)
        .slice(0, 5)
        .map((submission) => {
          const errorCount = submission.validations.reduce(
            (acc, v) => acc + (v.errors?.length ?? 0),
            0
          );
          const warningCount = submission.validations.reduce(
            (acc, v) => acc + (v.warnings?.length ?? 0),
            0
          );
          const title = submission.getDefaultOptions()?.data?.title;
          return {
            id: submission.id,
            title,
            errorCount,
            warningCount,
          };
        }),
    [submissionsWithErrors]
  );

  const totalErrors = issues.reduce((acc, i) => acc + i.errorCount, 0);
  const totalWarnings = issues.reduce((acc, i) => acc + i.warningCount, 0);

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group gap="xs" justify="space-between">
          <Group gap="xs">
            <ThemeIcon size="md" variant="light" color="red" radius="md">
              <IconAlertTriangle size={16} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              <Trans>Validation Issues</Trans>
            </Text>
          </Group>
          {issues.length > 0 && (
            <Group gap={4}>
              {totalErrors > 0 && (
                <Badge color="red" variant="light" size="sm">
                  {totalErrors} <Trans>errors</Trans>
                </Badge>
              )}
              {totalWarnings > 0 && (
                <Badge color="yellow" variant="light" size="sm">
                  {totalWarnings} <Trans>warnings</Trans>
                </Badge>
              )}
            </Group>
          )}
        </Group>

        {issues.length === 0 ? (
          <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EmptyState
              icon={<IconExclamationCircle size={32} />}
              message={<Trans>No validation issues</Trans>}
              description={<Trans>All submissions are ready to post</Trans>}
              size="sm"
            />
          </Box>
        ) : (
          <Stack gap="xs">
            {issues.map((issue) => (
              <Paper
                key={issue.id}
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-default)"
              >
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate fw={500} style={{ flex: 1, minWidth: 0 }}>
                    {issue.title || <Trans>Untitled</Trans>}
                  </Text>
                  <Group gap={4}>
                    {issue.errorCount > 0 && (
                      <Badge color="red" variant="light" size="xs">
                        {issue.errorCount}
                      </Badge>
                    )}
                    {issue.warningCount > 0 && (
                      <Badge color="yellow" variant="light" size="xs">
                        {issue.warningCount}
                      </Badge>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
