/**
 * DefaultsForm - Form for editing default submission options (title, description, tags, etc.).
 * These defaults are inherited by all website-specific options unless overridden.
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    Collapse,
    Group,
    Paper,
    Stack,
    Text,
    UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import {
    FormFieldsProvider,
    SectionLayout,
} from '../account-selection/form';
import { useSubmissionEditCardContext } from '../context';
import './defaults-form.css';

/**
 * Collapsible form section for editing default submission options.
 * The default options contain global settings like title, description, tags, and rating
 * that are inherited by all website-specific options.
 */
export function DefaultsForm() {
  const { submission } = useSubmissionEditCardContext();
  const [expanded, { toggle }] = useDisclosure(true);

  const defaultOption = submission.getDefaultOptions();

  if (!defaultOption) {
    return (
      <Text c="dimmed" size="sm">
        <Trans>No default options available</Trans>
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Paper withBorder radius="sm" p={0}>
        <UnstyledButton
          onClick={toggle}
          className="postybirb__defaults_form_header"
        >
          <Group gap="xs" px="sm" py="xs" wrap="nowrap">
            {expanded ? (
              <IconChevronDown size={14} style={{ flexShrink: 0 }} />
            ) : (
              <IconChevronRight size={14} style={{ flexShrink: 0 }} />
            )}
            <Text size="sm" fw={500} style={{ flex: 1 }}>
              <Trans>Defaults</Trans>
            </Text>
          </Group>
        </UnstyledButton>

        <Collapse in={expanded}>
          <Box p="sm" pt={0}>
            <ComponentErrorBoundary>
              <FormFieldsProvider
                option={defaultOption}
                submission={submission}
              >
                <SectionLayout />
              </FormFieldsProvider>
            </ComponentErrorBoundary>
          </Box>
        </Collapse>
      </Paper>
    </Stack>
  );
}
