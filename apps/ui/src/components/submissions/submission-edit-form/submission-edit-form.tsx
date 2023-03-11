import { EuiSideNav, EuiSideNavItemType, EuiTitle } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { ISubmissionOptions, SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import SubmissionFileSection from './components/submission-file-section/submission-file-section';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import { SubmissionFormWebsiteSelect } from './components/submission-form-website-select/submission-form-website-select';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';
import { SubmissionFormProps } from './submission-form-props';

type SubmissionEditFormProps = SubmissionFormProps & {
  accounts: IAccountDto[];
};

function scrollToAnchor(anchorId: string): void {
  const anchor = document.querySelector(`[data-anchor='${anchorId}']`);
  if (anchor) {
    anchor.scrollIntoView();
  }
}

function getSideNav(
  defaultOptionsId: string,
  websiteGroups: Record<
    string,
    { option: ISubmissionOptions; account: IAccountDto }[]
  >
): EuiSideNavItemType<unknown>[] {
  const sidenavOptions: EuiSideNavItemType<unknown>[] = [
    {
      name: 'Default Options',
      id: defaultOptionsId,
      onClick: () => {
        scrollToAnchor(defaultOptionsId);
      },
    },
  ];

  Object.entries(websiteGroups)
    .map(([key, value]) => ({
      name: key,
      id: key,
      items: value.map((v) => ({
        name: v.account.name,
        id: v.account.id,
        onClick: () => {
          scrollToAnchor(v.account.id);
        },
      })),
      onClick: () => {
        scrollToAnchor(key);
      },
    }))
    .forEach((record) => sidenavOptions.push(record));

  return sidenavOptions;
}

export default function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { accounts, submission, onUpdate } = props;

  const defaultOptions = submission.getDefaultOptions();
  const websiteBasedOptions = submission.options.filter((o) => !o.isDefault);

  const websiteGroups: Record<
    string,
    { option: ISubmissionOptions; account: IAccountDto }[]
  > = useMemo(() => {
    const groups: Record<
      string,
      { option: ISubmissionOptions; account: IAccountDto }[]
    > = {};

    websiteBasedOptions.forEach((option) => {
      // Safe to assume this will always have an account populated
      const account = accounts.find(
        (a) => a.id === option.account?.id
      ) as IAccountDto;

      if (!groups[account.websiteInfo.websiteDisplayName]) {
        groups[account.websiteInfo.websiteDisplayName] = [];
      }

      groups[account.websiteInfo.websiteDisplayName].push({
        account,
        option,
      });
    });

    return groups;
  }, [accounts, websiteBasedOptions]);

  const sidenavOptions: EuiSideNavItemType<unknown>[] = getSideNav(
    defaultOptions.id,
    websiteGroups
  );

  return (
    <div className="postybirb__submission-form">
      <div className="postybirb__submission-form-sections">
        {submission.type === SubmissionType.FILE ? (
          <SubmissionFormSection>
            <SubmissionFileSection {...props} />
          </SubmissionFormSection>
        ) : null}
        <SubmissionFormSection>
          <SubmissionFormWebsiteSelect {...props} />
        </SubmissionFormSection>
        <SubmissionFormSection key={defaultOptions.id}>
          <EuiTitle size="s">
            <h4 data-anchor={defaultOptions.id}>
              <FormattedMessage
                id="default-options"
                defaultMessage="Default Options"
              />
            </h4>
          </EuiTitle>
          <SubmissionOptionsSection
            {...props}
            option={defaultOptions}
            defaultOptions={defaultOptions}
            submission={submission}
            onUpdate={onUpdate}
          />
        </SubmissionFormSection>

        {Object.entries(websiteGroups)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([websiteName, optionPairs]) => (
            <SubmissionFormSection key={websiteName}>
              <EuiTitle size="s">
                <h4 data-anchor={websiteName}>{websiteName}</h4>
              </EuiTitle>
              {optionPairs.map((o) => (
                <SubmissionOptionsSection
                  {...props}
                  key={o.option.id}
                  option={o.option}
                  defaultOptions={defaultOptions}
                  submission={submission}
                  onUpdate={onUpdate}
                  account={o.account}
                />
              ))}
            </SubmissionFormSection>
          ))}
      </div>

      <div className="postybirb__submission-form-navigator">
        <EuiSideNav items={sidenavOptions} />
      </div>
    </div>
  );
}
