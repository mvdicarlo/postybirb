import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { IAccountDto, WebsiteOptionsDto } from '@postybirb/types';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { SubmissionFormProps } from '../../submission-form-props';

type SubmissionFormWebsiteSelectProps = SubmissionFormProps & {
  accounts: IAccountDto[];
};

export function SubmissionFormWebsiteSelect(
  props: SubmissionFormWebsiteSelectProps
) {
  const { accounts, submission, onUpdate } = props;
  const [options, setOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<
    EuiComboBoxOptionOption[]
  >([]);

  useEffect(() => {
    const opts: EuiComboBoxOptionOption[] = accounts.map((account) => ({
      label: `${account.websiteInfo.websiteDisplayName} - ${account.name}`,
      key: account.id,
    }));
    setOptions(opts.sort((a, b) => a.label.localeCompare(b.label)));
    setSelectedOptions(
      opts.filter((comboOpt) =>
        submission.options.some((option) => option.account === comboOpt.key)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, submission.options.length]);

  return (
    <EuiFormRow
      aria-required
      fullWidth
      id="website-select"
      label={<FormattedMessage id="form.websites" defaultMessage="Websites" />}
      aria-label="Websites"
    >
      <EuiComboBox
        compressed
        fullWidth
        aria-label="Websites"
        options={options}
        selectedOptions={selectedOptions}
        onChange={(newOptions) => {
          newOptions.forEach((o) => {
            // When new accounts are added
            if (!submission.options.some((opt) => opt.account === o.key)) {
              const account = accounts.find(
                (a) => a.id === o.key
              ) as IAccountDto<unknown>;
              // Somewhat messy creation
              const newSubmissionOptions: WebsiteOptionsDto = {
                id: Date.now().toString(),
                account: account.id,
                data: {},
              } as WebsiteOptionsDto;
              submission.options.push(newSubmissionOptions);
            }
          });

          submission.options
            .filter((o) => !o.isDefault) // Ignore default record
            .filter(
              (o) => !newOptions.some((newOpt) => newOpt.key === o.account)
            )
            .forEach((removedOption) => submission.removeOption(removedOption));

          setSelectedOptions(newOptions);
          onUpdate();
        }}
      />
    </EuiFormRow>
  );
}
