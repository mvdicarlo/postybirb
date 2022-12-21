import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { ISubmissionOptions } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import { SubmissionFormWebsiteSelect } from './components/submission-form-website-select/submission-form-website-select';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';
import { SubmissionFormProps } from './submission-form-props';

type SubmissionEditFormProps = SubmissionFormProps & {
  accounts: IAccountDto[];
};

export default function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { accounts, submission, onUpdate } = props;

  const defaultOptions = submission.getDefaultOptions();
  const websiteBasedOptions = submission.options.filter((o) => !!o.account);

  const websiteGroups: Record<
    string,
    { option: ISubmissionOptions; account: IAccountDto }[]
  > = {};
  websiteBasedOptions.forEach((option) => {
    // Safe to assume this will always have an account populated
    const account = accounts.find(
      (a) => a.id === option.account?.id
    ) as IAccountDto;

    if (!websiteGroups[account.websiteInfo.websiteDisplayName]) {
      websiteGroups[account.websiteInfo.websiteDisplayName] = [];
    }

    websiteGroups[account.websiteInfo.websiteDisplayName].push({
      account,
      option,
    });
  });

  return (
    <div className="postybirb__submission-form">
      <SubmissionFormSection>
        <SubmissionFormWebsiteSelect {...props} />
      </SubmissionFormSection>
      <SubmissionFormSection key={defaultOptions.id}>
        <EuiTitle size="s">
          <h4>
            <FormattedMessage
              id="default-options"
              defaultMessage="Default Options"
            />
          </h4>
        </EuiTitle>
        <SubmissionOptionsSection
          option={defaultOptions}
          submission={submission}
          onUpdate={onUpdate}
        />
      </SubmissionFormSection>

      {Object.entries(websiteGroups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([websiteName, optionPairs]) => (
          <SubmissionFormSection key={websiteName}>
            <EuiTitle size="s">
              <h4>{websiteName}</h4>
            </EuiTitle>
            <EuiSpacer />
            {optionPairs.map((o) => (
              <SubmissionOptionsSection
                key={o.option.id}
                option={o.option}
                submission={submission}
                onUpdate={onUpdate}
                account={o.account}
              />
            ))}
          </SubmissionFormSection>
        ))}
    </div>
  );
}
