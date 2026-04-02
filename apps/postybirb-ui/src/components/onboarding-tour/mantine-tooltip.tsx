/**
 * MantineTooltip - Custom Joyride tooltip component styled with Mantine.
 * Renders tour step content using Mantine Paper, Button, Title, etc.
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    Button,
    CloseButton,
    Group,
    Paper,
    Progress,
    Text,
    Title,
} from '@mantine/core';
import type { TooltipRenderProps } from 'react-joyride';

export function MantineTooltip({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) {
  return (
    <Paper
      shadow="lg"
      radius="md"
      p="md"
      maw={420}
      miw={300}
      {...tooltipProps}
    >
      {/* Header with close button */}
      <Group justify="space-between" mb="xs" wrap="nowrap">
        {step.title && (
          <Title order={5} style={{ flex: 1 }}>
            {step.title}
          </Title>
        )}
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <CloseButton onClick={closeProps.onClick} aria-label="Close" size="xs" variant="subtle" />
      </Group>

      {/* Content */}
      {step.content && (
        <Box mb="md">
          {typeof step.content === 'string' ? (
            <Text size="sm" c="dimmed">
              {step.content}
            </Text>
          ) : (
            step.content
          )}
        </Box>
      )}

      {/* Progress indicator */}
      <Group gap="xs" mb="md" align="center">
        <Progress value={((index + 1) / size) * 100} size="sm" style={{ flex: 1 }} />
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {index + 1} / {size}
        </Text>
      </Group>

      {/* Navigation buttons */}
      <Group justify="space-between">
        <Button variant="subtle" size="xs" {...skipProps}>
          <Trans>Skip</Trans>
        </Button>
        <Group gap="xs">
          {index > 0 && (
            <Button variant="default" size="xs" {...backProps}>
              <Trans>Back</Trans>
            </Button>
          )}
          {continuous && (
            <Button size="xs" {...primaryProps}>
              {isLastStep ? <Trans>Finish</Trans> : <Trans>Next</Trans>}
            </Button>
          )}
        </Group>
      </Group>
    </Paper>
  );
}
