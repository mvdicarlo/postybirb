import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { IAccountDto, NULL_ACCOUNT_ID } from '@postybirb/types';
import { useMemo } from 'react';
import { useWebsites } from '../../../../../hooks/account/use-websites';
import { useSubmission } from '../../../../../hooks/submission/use-submission';

export function SubmissionFormWebsiteSelect() {
  const { submission, addWebsiteOption, removeWebsiteOption, updateView } =
    useSubmission();
  const { accounts, filteredAccounts } = useWebsites();

  const options: EuiComboBoxOptionOption<IAccountDto>[] = useMemo(
    () =>
      filteredAccounts.map((website) => ({
        label: website.displayName,
        key: website.id,
        options: website.accounts.map((account) => ({
          label: account.name,
          key: account.id,
          value: account,
        })),
      })),
    [filteredAccounts]
  );

  const { _ } = useLingui();

  const selectedOptions: EuiComboBoxOptionOption<IAccountDto>[] = useMemo(
    () =>
      submission.options
        .filter((opt) => opt.account !== NULL_ACCOUNT_ID)
        .map((opt) => {
          const account = accounts.find((a) => a.id === opt.account);
          return {
            label: account?.name ?? _(msg`Unknown`),
            key: opt.account,
            value: account,
            prepend: <span>{account?.websiteInfo.websiteDisplayName} - </span>,
          };
        }),
    [_, accounts, submission.options]
  );

  return (
    <EuiFormRow
      aria-required
      fullWidth
      id="website-select"
      label={<Trans>Websites</Trans>}
      aria-label={_(msg`Websites`)}
    >
      <EuiComboBox
        compressed
        fullWidth
        aria-label={_(msg`Websites`)}
        options={options}
        selectedOptions={selectedOptions}
        onChange={(newOptions) => {
          newOptions.forEach((o) => {
            // When new accounts are added
            if (!submission.options.some((opt) => opt.account === o.key)) {
              if (o.value) {
                addWebsiteOption(o.value);
              }
            }
          });

          submission.options
            .filter((o) => !o.isDefault) // Ignore default record
            .filter(
              (o) => !newOptions.some((newOpt) => newOpt.key === o.account)
            )
            .forEach(removeWebsiteOption);

          updateView();
        }}
      />
    </EuiFormRow>
  );
}
