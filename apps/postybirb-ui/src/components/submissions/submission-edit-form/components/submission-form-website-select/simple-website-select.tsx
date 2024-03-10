import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { AccountId } from '@postybirb/types';
import { useEffect, useState } from 'react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { AccountStore } from '../../../../../stores/account.store';
import { useStore } from '../../../../../stores/use-store';

type SimpleWebsiteSelectProps = {
  onChange: (websitesIds: string[]) => void;
  submission: SubmissionDto;
  selected: AccountId[];
};

export function SimpleWebsiteSelect(props: SimpleWebsiteSelectProps) {
  const { selected, submission, onChange } = props;
  const { state: accounts, isLoading: isLoadingAccounts } =
    useStore(AccountStore);

  const [options, setOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const { _ } = useLingui();

  useEffect(() => {
    const opts: EuiComboBoxOptionOption[] = submission.options
      .map((option) => {
        const account = accounts.find((a) => a.id === option.account);
        if (account) {
          return {
            label: `${
              account.websiteInfo.websiteDisplayName || _(msg`Unknown`)
            } - ${account.name}`,
            key: account.id,
          };
        }
        return undefined;
      })
      .filter((o) => !!o) as EuiComboBoxOptionOption[];
    setOptions(opts.sort((a, b) => a.label.localeCompare(b.label)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, submission.options.length]);

  const selectedOptions: EuiComboBoxOptionOption[] = options.filter(
    (comboOpt) => selected.some((accountId) => accountId === comboOpt.key)
  );

  return (
    <EuiComboBox
      isLoading={isLoadingAccounts}
      fullWidth
      compressed
      isClearable
      aria-label={_(msg`Websites`)}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(newOptions) => {
        onChange(newOptions.map((option) => option.key as string));
      }}
    />
  );
}
