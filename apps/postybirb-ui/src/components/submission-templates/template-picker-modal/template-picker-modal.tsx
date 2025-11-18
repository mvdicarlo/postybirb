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
  ScrollArea, // Add import for ScrollArea
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  AccountId,
  IAccountDto,
  NULL_ACCOUNT_ID,
  SubmissionId,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import './template-picker-modal.css';

type TemplatePickerModalProps = {
  submissionId?: SubmissionId;
  type: SubmissionType;
  onClose: () => void;
  onApply: (options: WebsiteOptionsDto[]) => void;
};

type SubmissionOptionPair = {
  option: WebsiteOptionsDto;
  submission: SubmissionDto;
};

type AccountGroup = {
  account: IAccountDto;
  submissions: SubmissionOptionPair[];
};

function groupWebsiteOptions(
  submissions: SubmissionDto[],
  accounts: IAccountDto[],
  t: ReturnType<typeof useLingui>['t'],
): Record<string, AccountGroup> {
  const groups: Record<string, AccountGroup> = {};
  submissions.forEach((submission) => {
    submission.options.forEach((option) => {
      const account =
        accounts.find((a) => a.id === option.accountId) ??
        ({
          id: NULL_ACCOUNT_ID,
          name: t`Default`,
          websiteInfo: {
            websiteDisplayName: t`Default`,
          },
        } as IAccountDto);
      if (!groups[account.id]) {
        groups[account.id] = {
          account,
          submissions: [],
        };
      }

      groups[account.id].submissions.push({
        submission,
        option,
      });
    });
  });

  return groups;
}

export default function TemplatePickerModal(props: TemplatePickerModalProps) {
  const { submissionId, type, onApply, onClose } = props;
  const { state: templateState } = useStore(SubmissionTemplateStore);
  const { state: submissionsState } = useStore(SubmissionStore);
  const { t } = useLingui();
  const { accounts } = useWebsites();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedWebsiteOptions, setSelectedWebsiteOptions] =
    useState<Record<AccountId, WebsiteOptionsDto | null>>();
  const [overrideDescription, setOverrideDescription] = useState(true);
  const [overrideTitle, setOverrideTitle] = useState(false);

  const templates = templateState.filter((s) => s.type === type);
  const submissions = submissionsState.filter((s) => s.id !== submissionId);

  const templateOptions: ComboboxItem[] = templates.map((template) => ({
    label: template.getTemplateName(),
    value: template.id,
  }));

  const submissionOptions: ComboboxItem[] = submissions.map((submission) => ({
    label: submission.getDefaultOptions().data.title ?? t`Unknown`,
    value: submission.id,
  }));

  const options: ComboboxItemGroup[] = [
    {
      group: t`Templates`,
      items: templateOptions,
    },
    {
      group: t`Submissions`,
      items: submissionOptions,
    },
  ];

  const selectedTemplates: SubmissionDto[] = selected.map(
    (s) =>
      [...templates, ...submissions].find(
        (template) => template.id === s,
      ) as SubmissionDto,
  );

  const selectedGroups = groupWebsiteOptions(selectedTemplates, accounts, t);

  const clearSelection = () => {
    setSelected([]);
    setSelectedWebsiteOptions(undefined);
  };

  const groupedFormRows = selectedWebsiteOptions
    ? Object.values(selectedGroups).map((group) => {
        // Uses group.account.id for null type to keep id uniqueness for radio values
        const nullId = group.account.id;
        const checkboxOptions: {
          label: string | JSX.Element;
          id: string;
          option?: WebsiteOptionsDto;
        }[] = [
          {
            label: <Trans context="Template picker checkbox">None</Trans>,
            id: nullId,
          },
        ];

        const currentSelection = selectedWebsiteOptions[group.account.id];
        group.submissions.forEach(({ submission, option }) => {
          checkboxOptions.push({
            id: option.id,
            label: submission.getDefaultOptions().data.title ?? t`Unknown`,
            option,
          });
        });

        return (
          <Fieldset
            key={group.account.id}
            legend={
              <Group gap="xs" wrap="nowrap" align="center">
                <Text fw={500} size="sm">
                  {group.account.id === NULL_ACCOUNT_ID
                    ? t`Default`
                    : `${group.account.websiteInfo.websiteDisplayName} - ${group.account.name}`}
                </Text>
                <Text size="xs" c="dimmed" fs="italic">
                  ({checkboxOptions.length - 1} {t`options`})
                </Text>
              </Group>
            }
            className="template-picker-fieldset"
          >
            <Checkbox.Group value={[currentSelection?.id ?? nullId]}>
              {checkboxOptions.map((o) => (
                <Checkbox
                  mt="xs"
                  key={o.id}
                  value={o.id}
                  label={o.label}
                  className="template-picker-checkbox"
                  onChange={() => {
                    const { option } = o;
                    setSelectedWebsiteOptions({
                      ...selectedWebsiteOptions,
                      [group.account.id]: option || null,
                    });
                  }}
                />
              ))}
            </Checkbox.Group>
          </Fieldset>
        );
      })
    : null;

  const overrideOptions = groupedFormRows ? (
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
          id="import-template-override-title"
          onChange={() => {
            setOverrideTitle(!overrideTitle);
          }}
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
          id="import-template-override-description"
          onChange={() => {
            setOverrideDescription(!overrideDescription);
          }}
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
      className="template-picker-modal"
    >
      {/* Header Section - Template Selection */}
      <Box className="template-picker-header">
        <MultiSelect
          clearable
          required
          searchable
          nothingFoundMessage={<Trans>No templates found</Trans>}
          label={<Trans>Select templates or submissions to import</Trans>}
          description={<Trans>You can select multiple items</Trans>}
          data={options}
          style={{ width: '100%' }}
          value={selected}
          onChange={(newOpts) => {
            setSelected(newOpts);
            // On first option pick
            if (!selectedWebsiteOptions && newOpts.length) {
              const sub: Record<AccountId, WebsiteOptionsDto> = {};
              const template = [...templates, ...submissions].find(
                (temp) => temp.id === newOpts[0],
              );
              if (!template) {
                // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
                console.error('Cannot find template', template);
                return;
              }

              template.options.forEach((o) => {
                sub[o.accountId] = o;
              });
              setSelectedWebsiteOptions(sub);
            }

            // Reset
            if (!newOpts.length) {
              setSelectedWebsiteOptions(undefined);
            }
          }}
        />
      </Box>

      {/* Middle Section - Scrollable Content */}
      <Box className="template-picker-content">
        {selected.length > 0 && (
          <>
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
          </>
        )}

        <ScrollArea className="template-picker-scroll-area">
          <Stack gap="xs">
            {groupedFormRows}
            {overrideOptions}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Footer Section - Buttons */}
      <Group justify="end" className="template-picker-footer">
        <Button
          variant="subtle"
          c="var(--mantine-color-text)"
          onClick={onClose}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button
          disabled={Object.values(selectedWebsiteOptions ?? {}).length === 0}
          onClick={() => {
            if (selectedWebsiteOptions) {
              onApply(
                (
                  Object.values(selectedWebsiteOptions).filter(
                    (o) => o !== null,
                  ) as WebsiteOptionsDto[]
                ).map((o: WebsiteOptionsDto) => {
                  const option = { ...o };
                  // Remove fields based on override options
                  // Or remove if the fields are just empty
                  if (
                    !overrideDescription ||
                    option.data.description?.description
                  ) {
                    delete option.data.description;
                  }
                  if (!overrideTitle || !option.data.title?.trim()) {
                    delete option.data.title;
                  }
                  return option;
                }),
              );
            }
          }}
        >
          <Trans>Apply</Trans>
        </Button>
      </Group>
    </Modal>
  );
}
