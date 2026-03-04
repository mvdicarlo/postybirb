/**
 * TemplatePickerModal - Modal for selecting templates and applying options to submissions.
 * Allows per-account template selection and override controls for title/description.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    Box,
    Button,
    Checkbox,
    ComboboxItem,
    ComboboxItemGroup,
    Divider,
    Fieldset,
    Group,
    Modal,
    MultiSelect,
    ScrollArea,
    Stack,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    AccountId,
    IWebsiteFormFields,
    NULL_ACCOUNT_ID,
    SubmissionId,
    SubmissionType,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import {
    AccountRecord,
    SubmissionRecord,
    useAccounts,
    useSubmissionsByType,
    useTemplateSubmissions,
} from '../../../stores';
import {
    showErrorNotification,
    showSuccessNotification,
} from '../../../utils/notifications';

interface TemplatePickerModalProps {
  /** Target submission IDs to apply templates to (also excluded from sources) */
  targetSubmissionIds: SubmissionId[];
  /** Filter by submission type */
  type: SubmissionType;
  /** Called when modal should close */
  onClose: () => void;
  /** Called after successful apply */
  onApply?: () => void;
}

type SubmissionOptionPair = {
  option: WebsiteOptionsDto;
  submission: SubmissionRecord;
};

type AccountGroup = {
  account:
    | AccountRecord
    | { id: AccountId; name: string; websiteDisplayName: string };
  submissions: SubmissionOptionPair[];
};

/**
 * Groups website options from selected submissions by account.
 */
function groupWebsiteOptions(
  submissions: SubmissionRecord[],
  accounts: AccountRecord[],
  defaultLabel: string,
): Record<AccountId, AccountGroup> {
  const groups: Record<AccountId, AccountGroup> = {};

  submissions.forEach((submission) => {
    submission.options.forEach((option) => {
      const account = accounts.find((a) => a.id === option.accountId);
      const groupAccount = account ?? {
        id: NULL_ACCOUNT_ID as AccountId,
        name: defaultLabel,
        websiteDisplayName: defaultLabel,
      };

      if (!groups[groupAccount.id]) {
        groups[groupAccount.id] = { account: groupAccount, submissions: [] };
      }

      groups[groupAccount.id].submissions.push({ submission, option });
    });
  });

  return groups;
}

/**
 * Modal for picking templates and applying their options to submissions.
 */
export function TemplatePickerModal({
  targetSubmissionIds,
  type,
  onClose,
  onApply,
}: TemplatePickerModalProps) {
  const { t } = useLingui();
  const accounts = useAccounts();
  const templates = useTemplateSubmissions();
  const submissions = useSubmissionsByType(type);

  // State for selected source templates/submissions
  const [selected, setSelected] = useState<string[]>([]);
  // State for per-account option selections
  const [selectedWebsiteOptions, setSelectedWebsiteOptions] =
    useState<Record<AccountId, WebsiteOptionsDto | null>>();
  // Override flags
  const [overrideDescription, setOverrideDescription] = useState(true);
  const [overrideTitle, setOverrideTitle] = useState(false);
  // Loading state
  const [isApplying, setIsApplying] = useState(false);

  // Filter templates by type
  const filteredTemplates = useMemo(
    () => templates.filter((tmpl) => tmpl.type === type),
    [templates, type],
  );

  // Filter submissions (non-archived, not targets, same type)
  const filteredSubmissions = useMemo(
    () =>
      submissions
        .filter((s) => !s.isArchived)
        .filter((s) => !targetSubmissionIds.includes(s.id))
        .filter((s) => !s.isTemplate)
        .filter((s) => !s.isMultiSubmission),
    [submissions, targetSubmissionIds],
  );

  // Build options for MultiSelect
  const options: ComboboxItemGroup[] = useMemo(() => {
    const templateItems: ComboboxItem[] = filteredTemplates.map((tmpl) => ({
      label: tmpl.title || t`Untitled Template`,
      value: tmpl.id,
    }));

    const submissionItems: ComboboxItem[] = filteredSubmissions.map((sub) => ({
      label: sub.title || t`Untitled`,
      value: sub.id,
    }));

    return [
      { group: t`Templates`, items: templateItems },
      { group: t`Submissions`, items: submissionItems },
    ];
  }, [filteredTemplates, filteredSubmissions, t]);

  // Get the selected submissions/templates
  const selectedSources = useMemo(
    () =>
      selected
        .map((id) =>
          [...filteredTemplates, ...filteredSubmissions].find(
            (s) => s.id === id,
          ),
        )
        .filter(Boolean) as SubmissionRecord[],
    [selected, filteredTemplates, filteredSubmissions],
  );

  // Group selected options by account
  const selectedGroups = useMemo(
    () => groupWebsiteOptions(selectedSources, accounts, t`Default`),
    [selectedSources, accounts, t],
  );

  // Handle selection change
  const handleSelectionChange = useCallback(
    (newSelected: string[]) => {
      setSelected(newSelected);

      // Initialize account options on first selection
      if (!selectedWebsiteOptions && newSelected.length) {
        const firstSource = [...filteredTemplates, ...filteredSubmissions].find(
          (s) => s.id === newSelected[0],
        );
        if (firstSource) {
          const initial: Record<AccountId, WebsiteOptionsDto> = {};
          firstSource.options.forEach((opt) => {
            initial[opt.accountId as AccountId] = opt;
          });
          setSelectedWebsiteOptions(initial);
        }
      }

      // Reset on empty selection
      if (!newSelected.length) {
        setSelectedWebsiteOptions(undefined);
      }
    },
    [selectedWebsiteOptions, filteredTemplates, filteredSubmissions],
  );

  // Handle apply
  const handleApply = useCallback(async () => {
    if (!selectedWebsiteOptions) return;

    // Build options array from selections
    const optionsToApply = Object.values(selectedWebsiteOptions)
      .filter((opt): opt is WebsiteOptionsDto => opt !== null)
      .map((opt) => {
        const data = { ...opt.data };

        // Strip description if not overriding or if empty (check array length)
        if (!overrideDescription || !data.description?.description?.content?.length) {
          delete data.description;
        }

        // Strip title if not overriding or if empty
        if (!overrideTitle || !data.title?.trim()) {
          delete data.title;
        }

        return {
          accountId: opt.accountId as AccountId,
          data: data as IWebsiteFormFields,
        };
      });

    if (optionsToApply.length === 0) {
      showErrorNotification(<Trans>No options selected to apply</Trans>);
      return;
    }

    setIsApplying(true);
    try {
      const result = await submissionApi.applyTemplateOptions({
        targetSubmissionIds,
        options: optionsToApply,
        overrideTitle,
        overrideDescription,
      });

      const successCount = result.body.success;
      const failedCount = result.body.failed;
      if (failedCount > 0) {
        showErrorNotification(
          <Trans>
            Applied to {successCount} submissions, {failedCount} failed
          </Trans>,
        );
      } else {
        showSuccessNotification(
          <Trans>Applied template options to {successCount} submissions</Trans>,
        );
      }

      onApply?.();
      onClose();
    } catch {
      showErrorNotification(<Trans>Failed to apply template options</Trans>);
    } finally {
      setIsApplying(false);
    }
  }, [
    selectedWebsiteOptions,
    targetSubmissionIds,
    overrideTitle,
    overrideDescription,
    onApply,
    onClose,
  ]);

  // Render per-account selection fieldsets
  const accountFieldsets = selectedWebsiteOptions
    ? Object.values(selectedGroups).map((group) => {
        // Get the account ID - either from AccountRecord or from the fallback object
        const accountId =
          group.account instanceof AccountRecord
            ? group.account.accountId
            : group.account.id;

        // Get the display name
        const displayName =
          accountId === NULL_ACCOUNT_ID
            ? t`Default`
            : group.account instanceof AccountRecord
              ? `${group.account.websiteDisplayName} - ${group.account.name}`
              : `${group.account.websiteDisplayName} - ${group.account.name}`;

        // Build checkbox options (None + each template option)
        const checkboxOptions: Array<{
          label: string | JSX.Element;
          id: string;
          option?: WebsiteOptionsDto;
        }> = [{ label: <Trans>None</Trans>, id: accountId }];

        group.submissions.forEach(({ submission, option }) => {
          checkboxOptions.push({
            id: option.id,
            label: submission.title || t`Untitled`,
            option,
          });
        });

        const currentSelection = selectedWebsiteOptions[accountId];

        return (
          <Fieldset
            key={accountId}
            legend={
              <Text fw={500} size="sm">
                {displayName}
              </Text>
            }
          >
            <Checkbox.Group value={[currentSelection?.id ?? accountId]}>
              {checkboxOptions.map((opt) => (
                <Checkbox
                  mt="xs"
                  key={opt.id}
                  value={opt.id}
                  label={opt.label}
                  onChange={() => {
                    setSelectedWebsiteOptions({
                      ...selectedWebsiteOptions,
                      [accountId]: opt.option ?? null,
                    });
                  }}
                />
              ))}
            </Checkbox.Group>
          </Fieldset>
        );
      })
    : null;

  // Override options section
  const overrideOptionsSection = accountFieldsets ? (
    <>
      <Divider
        label={
          <Text fw={500}>
            <Trans>Options</Trans>
          </Text>
        }
        labelPosition="center"
        mt="sm"
      />
      <Group mt="xs">
        <Checkbox
          checked={overrideTitle}
          label={
            <Group gap={4} wrap="nowrap">
              <Trans context="import.override-title">Replace title</Trans>
              <Tooltip
                label={
                  <Trans>
                    Replace the current title with the selected template's title
                  </Trans>
                }
                position="top"
                withArrow
              >
                <IconInfoCircle
                  size="1em"
                  style={{ opacity: 0.5 }}
                  stroke={1.5}
                />
              </Tooltip>
            </Group>
          }
          onChange={() => setOverrideTitle(!overrideTitle)}
        />
        <Checkbox
          checked={overrideDescription}
          label={
            <Group gap={4} wrap="nowrap">
              <Trans context="import.override-description">
                Replace description
              </Trans>
              <Tooltip
                label={
                  <Trans>
                    Replace the current description with the selected template's
                    description
                  </Trans>
                }
                position="top"
                withArrow
              >
                <IconInfoCircle
                  size="1em"
                  style={{ opacity: 0.5 }}
                  stroke={1.5}
                />
              </Tooltip>
            </Group>
          }
          onChange={() => setOverrideDescription(!overrideDescription)}
        />
      </Group>
    </>
  ) : null;

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Title order={4}>
          <Trans context="template.picker-modal-header">Choose Templates</Trans>
        </Title>
      }
      size="lg"
      padding="md"
      styles={{
        body: {
          display: 'grid',
          // eslint-disable-next-line lingui/no-unlocalized-strings
          gridTemplateRows: 'auto 1fr auto',
          height: 'calc(90vh - 100px)',
          gap: 'var(--mantine-spacing-md)',
          paddingBottom: 'var(--mantine-spacing-md)',
        },
      }}
    >
      {/* Header - Template Selection */}
      <Box>
        <MultiSelect
          clearable
          required
          searchable
          nothingFoundMessage={<Trans>No templates or submissions found</Trans>}
          label={<Trans>Select templates or submissions to import</Trans>}
          data={options}
          value={selected}
          onChange={handleSelectionChange}
        />
      </Box>

      {/* Middle - Scrollable Content */}
      <Box style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {selected.length > 0 && (
          <Box style={{ flexShrink: 0 }}>
            <Divider
              label={
                <Text fw={500}>
                  <Trans>Account Options</Trans>
                </Text>
              }
              labelPosition="center"
              my="sm"
            />
            <Text size="sm" c="dimmed" mb="xs">
              <Trans>Select which template to use for each account</Trans>
            </Text>
          </Box>
        )}

        <ScrollArea style={{ flex: 1, minHeight: 0 }}>
          <Stack gap="xs" pb="md">
            {accountFieldsets}
            {overrideOptionsSection}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Footer - Buttons */}
      <Group justify="end">
        <Button
          variant="subtle"
          c="var(--mantine-color-text)"
          onClick={onClose}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button
          disabled={
            !selectedWebsiteOptions ||
            Object.keys(selectedWebsiteOptions).length === 0
          }
          loading={isApplying}
          onClick={handleApply}
        >
          <Trans>Apply</Trans>
        </Button>
      </Group>
    </Modal>
  );
}
