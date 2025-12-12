/**
 * AccountOptionRow - A single account checkbox row with expandable inline form section.
 * When checked, creates a website option via API. When unchecked, removes it.
 */

import { Trans } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Checkbox,
    Collapse,
    Group,
    Loader,
    Paper,
    Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionRating, type WebsiteOptionsDto } from '@postybirb/types';
import { useCallback, useState } from 'react';
import websiteOptionsApi from '../../../../../api/website-options.api';
import type { AccountRecord } from '../../../../../stores/records';
import { useSubmissionEditCardContext } from '../context';
import './account-selection.css';
import { FormFieldsProvider, SectionLayout } from './form';

export interface AccountOptionRowProps {
  /** The account to display */
  account: AccountRecord;
  /** The existing website option for this account, if selected */
  websiteOption: WebsiteOptionsDto | null;
}

/**
 * A single account row with checkbox and expandable form section.
 */
export function AccountOptionRow({
  account,
  websiteOption,
}: AccountOptionRowProps) {
  const { submission } = useSubmissionEditCardContext();
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, { open, close }] = useDisclosure(websiteOption !== null);

  const isSelected = websiteOption !== null;

  // Handle checkbox toggle - calls API to add/remove website option
  const handleToggle = useCallback(
    async (checked: boolean) => {
      setIsLoading(true);
      try {
        if (checked) {
          // Get default rating from submission's default options
          const defaultOption = submission.options.find((opt) => opt.isDefault);
          const rating =
            defaultOption?.data?.rating ?? SubmissionRating.GENERAL;

          // Create a new website option for this account
          await websiteOptionsApi.create({
            submissionId: submission.id,
            accountId: account.accountId,
            data: { rating },
          });
          open();
        } else if (websiteOption) {
          // Remove the existing website option
          await websiteOptionsApi.remove([websiteOption.id]);
          close();
        }
      } catch (error) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to update website option:', error);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submission.id, account.accountId, websiteOption, open, close],
  );

  return (
    <Box className="postybirb__account_option_row">
      <Group gap="xs" px="sm" py={6} wrap="nowrap">
        {isLoading ? (
          <Loader size="xs" />
        ) : (
          <Checkbox
            size="xs"
            checked={isSelected}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label={`Select ${account.name}`}
          />
        )}
        <Text size="sm" style={{ flex: 1 }}>
          {account.name}
        </Text>
        {account.username && (
          <Text size="xs" c="dimmed">
            ({account.username})
          </Text>
        )}
        {!account.isLoggedIn && (
          <Badge size="xs" variant="light" color="orange">
            <Trans>Not logged in</Trans>
          </Badge>
        )}
      </Group>

      {/* Expandable inline form section - shown when selected */}
      <Collapse in={expanded && isSelected} ml="lg">
        <Paper
          withBorder
          radius="sm"
          p="sm"
          ml="xl"
          mr="sm"
          mb="xs"
          className="postybirb__account_option_form"
        >
          {websiteOption && (
            <FormFieldsProvider option={websiteOption} submission={submission}>
              <SectionLayout />
            </FormFieldsProvider>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
