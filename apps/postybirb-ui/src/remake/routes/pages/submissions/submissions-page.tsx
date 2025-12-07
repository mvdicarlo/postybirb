/**
 * SubmissionsPage - Demo section for the Submissions navigation item.
 * Includes pagination demo.
 */

/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

/**
 * Submissions page demo component.
 * Displays placeholder content with pagination example.
 */
export function SubmissionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = 47;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Simulated submission items
  const submissions = Array.from({ length: itemsPerPage }, (_, i) => ({
    id: (currentPage - 1) * itemsPerPage + i + 1,
    title: `Submission ${(currentPage - 1) * itemsPerPage + i + 1}`,
    status: ['draft', 'scheduled', 'posted', 'failed'][i % 4],
  }));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>
          <Trans>Submissions</Trans>
        </Title>
        <Text c="dimmed" size="sm">
          <Trans>
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </Trans>
        </Text>
      </Group>

      {submissions.map((submission) => (
        <Paper key={submission.id} p="md" withBorder>
          <Group justify="space-between">
            <Text fw={500}>{submission.title}</Text>
            <Badge
              color={
                submission.status === 'posted'
                  ? 'green'
                  : submission.status === 'scheduled'
                  ? 'blue'
                  : submission.status === 'failed'
                  ? 'red'
                  : 'gray'
              }
            >
              {submission.status}
            </Badge>
          </Group>
        </Paper>
      ))}

      <Text c="dimmed" size="sm" ta="center">
        <Trans>
          Page {currentPage} of {totalPages}
        </Trans>
      </Text>
    </Stack>
  );
}
