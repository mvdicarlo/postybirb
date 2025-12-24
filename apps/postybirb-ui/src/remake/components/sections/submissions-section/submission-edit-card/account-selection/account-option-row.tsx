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
import { SubmissionRating, type WebsiteOptionsDto } from '@postybirb/types';
import { useCallback, useEffect, useState } from 'react';
import websiteOptionsApi from '../../../../../api/website-options.api';
import type { AccountRecord } from '../../../../../stores/records';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import { useSubmissionEditCardContext } from '../context';
import './account-selection.css';
import { FormFieldsProvider, SectionLayout } from './form';

export interface AccountOptionRowProps {
  /** The account to display */
  account: AccountRecord;
  /** The existing website option for this account, if selected */
  websiteOption: WebsiteOptionsDto | null;
  /** Whether this account has validation errors */
  hasErrors: boolean;
  /** Whether this account has validation warnings */
  hasWarnings: boolean;
}

/**
 * A single account row with checkbox and expandable form section.
 */
export function AccountOptionRow({
  account,
  websiteOption,
  hasErrors,
  hasWarnings,
}: AccountOptionRowProps) {
  const { submission } = useSubmissionEditCardContext();
  const [isLoading, setIsLoading] = useState(false);
  // Track manual collapse state - null means use default (expanded when selected)
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  const isSelected = websiteOption !== null;

  // Determine expanded state: use manual override if set, otherwise default to selected state
  // Reset manual state when selection changes
  const expanded = manualExpanded ?? isSelected;

  // Reset manual expanded state when websiteOption changes (e.g., template applied or removed)
  useEffect(() => {
    setManualExpanded(null);
  }, [websiteOption]);

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
          setManualExpanded(true);
        } else if (websiteOption) {
          // Remove the existing website option
          await websiteOptionsApi.remove([websiteOption.id]);
          setManualExpanded(false);
        }
      } catch (error) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to update website option:', error);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submission.id, account.accountId, websiteOption],
  );

  return (
    <ComponentErrorBoundary>
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
            <Badge
              color="green"
              variant="transparent"
              style={{ textTransform: 'none' }}
            >
              {account.username}
            </Badge>
          )}
          {hasErrors && (
            <Badge size="xs" variant="light" color="red">
              <Trans>Error</Trans>
            </Badge>
          )}
          {hasWarnings && (
            <Badge size="xs" variant="light" color="yellow">
              <Trans>Warning</Trans>
            </Badge>
          )}
          {!account.isLoggedIn && (
            <Badge size="xs" variant="light" color="orange">
              <Trans>Not logged in</Trans>
            </Badge>
          )}
        </Group>

        {/* Expandable inline form section - shown when selected */}
        <Collapse
          in={expanded && isSelected}
          ml="lg"
          key={`${account.accountId}-${websiteOption?.id ?? 'none'}`}
        >
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
              <ComponentErrorBoundary>
                <FormFieldsProvider
                  option={websiteOption}
                  submission={submission}
                >
                  <SectionLayout key={websiteOption.id} />
                </FormFieldsProvider>
              </ComponentErrorBoundary>
            )}
          </Paper>
        </Collapse>
      </Box>
    </ComponentErrorBoundary>
  );
}
