import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiCheckboxGroup,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import {
  EuiCheckboxGroupIdToSelectedMap,
  EuiCheckboxGroupOption,
} from '@elastic/eui/src/components/form/checkbox/checkbox_group';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
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

const formId = 'template-picker-form';

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
  _: ReturnType<typeof useLingui>['_']
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
  const { accounts } = useWebsites();
  const [selected, setSelected] = useState<
    EuiComboBoxOptionOption<SubmissionDto>[]
  >([]);
  const [selectedWebsiteOptions, setSelectedWebsiteOptions] =
    useState<Record<AccountId, WebsiteOptionsDto | null>>();
  const [overrideDescription, setOverrideDescription] = useState(true);
  const [overrideTitle, setOverrideTitle] = useState(false);

  const templates = templateState.filter((s) => s.type === type);
  const submissions = submissionsState.filter((s) => s.id !== submissionId);

  const templateOptions: EuiComboBoxOptionOption<SubmissionDto>[] =
    templates.map((template) => ({
      label: template.getTemplateName(),
      key: template.id,
      value: template,
    }));

  const { _ } = useLingui();
  const submissionOptions: EuiComboBoxOptionOption<SubmissionDto>[] =
    submissions.map((submission) => ({
      label: submission.getDefaultOptions().data.title ?? _(msg`Unknown`),
      key: submission.id,
      value: submission,
    }));

  const options: EuiComboBoxOptionOption<SubmissionDto>[] = [
    {
      isGroupLabelOption: true,
      label: _(msg`Templates`),
      options: templateOptions,
    },
    {
      isGroupLabelOption: true,
      label: _(msg`Submissions`),
      options: submissionOptions,
    },
  ];

  const selectedTemplates: EuiComboBoxOptionOption<SubmissionDto>[] =
    selected.map((s) => ({
      label: s.label,
      key: s.key,
      value: s.value,
      prepend: <span>{s.value?.getTemplateName()} -</span>,
    }));

  const selectedGroups = groupWebsiteOptions(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    selectedTemplates.map((s) => s.value!),
    accounts,
    _
  );

  const groupedFormRows = selectedWebsiteOptions
    ? Object.values(selectedGroups).map((group) => {
        // Uses group.account.id for null type to keep id uniqueness for radio values
        const nullId = group.account.id;
        const idMap: EuiCheckboxGroupIdToSelectedMap = {};
        const checkboxOptions: EuiCheckboxGroupOption[] = [
          {
            label: <Trans context="Template picker checkbox">None</Trans>,
            id: nullId,
          },
        ];

        const currentSelection = selectedWebsiteOptions[group.account.id];
        idMap[currentSelection?.id ?? nullId] = true;
        group.submissions.forEach(({ submission, option }) => {
          checkboxOptions.push({
            id: option.id,
            label: submission.getDefaultOptions().data.title ?? _(msg`Unknown`),
          });
        });

        return (
          <EuiFormRow
            label={
              group.account.id === NULL_ACCOUNT_ID
                ? _(msg`Default`)
                : `${group.account.websiteInfo.websiteDisplayName} - ${group.account.name}`
            }
          >
            <EuiCheckboxGroup
              compressed
              idToSelectedMap={idMap}
              options={checkboxOptions}
              onChange={(id) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const opt = group.submissions.find(
                  ({ option }) => option.id === id
                );
                setSelectedWebsiteOptions({
                  ...selectedWebsiteOptions,
                  [group.account.id]: opt ? opt.option : null,
                });
              }}
            />
          </EuiFormRow>
        );
      })
    : null;

  const overrideOptions = groupedFormRows ? (
    <>
      <EuiCheckbox
        checked={overrideTitle}
        label={<Trans context="import.override-title">Replace title</Trans>}
        id="import-template-override-title"
        onChange={() => {
          setOverrideTitle(!overrideTitle);
        }}
      />
      <EuiCheckbox
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
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <Trans context="template.picker-modal-header">Choose Templates</Trans>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
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
                    option.data.description?.description.trim()
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
          <EuiComboBox
            fullWidth
            isClearable
            options={options}
            selectedOptions={selectedTemplates}
            onChange={(newOpts) => {
              setSelected(newOpts);

              // On first option pick
              if (!selectedWebsiteOptions && newOpts.length) {
                const sub: Record<AccountId, WebsiteOptionsDto> = {};
                newOpts[0].value?.options.forEach((o) => {
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
          <EuiSpacer size="s" />
          {overrideOptions}
          <EuiSpacer size="s" />
          {groupedFormRows}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <Trans>Cancel</Trans>
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form={formId}
          fill
          disabled={Object.values(selectedWebsiteOptions ?? {}).length === 0}
        >
          <Trans>Apply</Trans>
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
