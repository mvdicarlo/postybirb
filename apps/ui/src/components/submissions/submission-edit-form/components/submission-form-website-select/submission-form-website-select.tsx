import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { ISubmissionOptions } from '@postybirb/types';
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
        submission.options.some((option) => option.account?.id === comboOpt.key)
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
            if (!submission.options.some((opt) => opt.account?.id === o.key)) {
              const account = accounts.find(
                (a) => a.id === o.key
              ) as IAccountDto<unknown>;
              // Somewhat messy creation
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const newSubmissionOptions: ISubmissionOptions<any> = {
                id: Date.now().toString(),
                account: {
                  id: account.id,
                  name: account.name,
                  website: account.website,
                  groups: account.groups,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  markedForDeletion: false,
                },
                data: {},
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as ISubmissionOptions<any>;
              submission.options.push(newSubmissionOptions);
            }
          });

          submission.options
            .filter((o) => !o.isDefault) // Ignore default record
            .filter(
              (o) => !newOptions.some((newOpt) => newOpt.key === o.account?.id)
            )
            .forEach((removedOption) => submission.removeOption(removedOption));

          setSelectedOptions(newOptions);
          onUpdate();
        }}
      />
    </EuiFormRow>
  );
}
