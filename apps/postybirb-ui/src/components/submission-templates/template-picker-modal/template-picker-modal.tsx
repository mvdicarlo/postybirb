import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  Button,
  Checkbox,
  ComboboxItem,
  ComboboxItemGroup,
  Fieldset,
  Group,
  Modal,
  MultiSelect,
  ScrollArea,
  Stack,
  Title,
} from '@mantine/core';
import {
  AccountId,
  IAccountDto,
  NULL_ACCOUNT_ID,
  SubmissionId,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { TransHook } from '../../../hooks/use-trans';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';

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
  _: TransHook
): Record<string, AccountGroup> {
  const groups: Record<string, AccountGroup> = {};
  submissions.forEach((submission) => {
    submission.options.forEach((option) => {
      const account =
        accounts.find((a) => a.id === option.account) ??
        ({
          id: NULL_ACCOUNT_ID,
          name: _(msg`Default`),
          websiteInfo: {
            websiteDisplayName: _(msg`Default`),
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
  const { _ } = useLingui();
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
    label: submission.getDefaultOptions().data.title ?? _(msg`Unknown`),
    value: submission.id,
  }));

  const options: ComboboxItemGroup[] = [
    {
      group: _(msg`Templates`),
      items: templateOptions,
    },
    {
      group: _(msg`Submissions`),
      items: submissionOptions,
    },
  ];

  const selectedTemplates: SubmissionDto[] = selected.map(
    (s) =>
      [...templates, ...submissions].find((t) => t.id === s) as SubmissionDto
  );

  const selectedGroups = groupWebsiteOptions(selectedTemplates, accounts, _);

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
            label: submission.getDefaultOptions().data.title ?? _(msg`Unknown`),
            option,
          });
        });

        return (
          <Fieldset
            legend={
              group.account.id === NULL_ACCOUNT_ID
                ? _(msg`Default`)
                : `${group.account.websiteInfo.websiteDisplayName} - ${group.account.name}`
            }
          >
            <Checkbox.Group value={[currentSelection?.id ?? nullId]}>
              {checkboxOptions.map((o) => (
                <Checkbox
                  mt="4"
                  key={o.id}
                  value={o.id}
                  label={o.label}
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
      <Checkbox
        checked={overrideTitle}
        label={<Trans context="import.override-title">Replace title</Trans>}
        id="import-template-override-title"
        onChange={() => {
          setOverrideTitle(!overrideTitle);
        }}
      />
      <Checkbox
        checked={overrideDescription}
        label={
          <Trans context="import.override-description">
            Replace description
          </Trans>
        }
        id="import-template-override-description"
        onChange={() => {
          setOverrideDescription(!overrideDescription);
        }}
      />
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
    >
      <Stack gap="xs">
        <MultiSelect
          clearable
          required
          label={<Trans>Templates</Trans>}
          data={options}
          onChange={(newOpts) => {
            setSelected(newOpts);
            // On first option pick
            if (!selectedWebsiteOptions && newOpts.length) {
              const sub: Record<AccountId, WebsiteOptionsDto> = {};
              const template = [...templates, ...submissions].find(
                (t) => t.id === newOpts[0]
              )!;
              template.options.forEach((o) => {
                sub[o.account] = o;
              });
              setSelectedWebsiteOptions(sub);
            }

            // Reset
            if (!newOpts.length) {
              setSelectedWebsiteOptions(undefined);
            }
          }}
        />
        <ScrollArea h={400} style={{ overflowY: 'auto' }}>
          <Stack gap="xs">
            {overrideOptions}
            {groupedFormRows}
          </Stack>
        </ScrollArea>
        <Group justify="end">
          <Button variant="subtle" color="red" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={Object.values(selectedWebsiteOptions ?? {}).length === 0}
            onClick={() => {
              if (selectedWebsiteOptions) {
                onApply(
                  (
                    Object.values(selectedWebsiteOptions).filter(
                      (o) => o !== null
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
                  })
                );
              }
            }}
          >
            <Trans>Apply</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
