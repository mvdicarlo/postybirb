import { EuiSideNav, EuiSideNavItemType } from '@elastic/eui';
import { IWebsiteInfoDto } from '@postybirb/types';
import { useWebsites } from '../../../hooks/account/use-websites';
import { useSubmission } from '../../../hooks/hooks/use-submission';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import { SubmissionFormWebsiteSelect } from './components/submission-form-website-select/submission-form-website-select';
import './submission-edit-form.css';

function scrollToAnchor(anchorId: string): void {
  const anchor = document.querySelector(`[data-anchor='${anchorId}']`);
  if (anchor) {
    anchor.scrollIntoView();
  }
}

function getSideNav(
  submission: SubmissionDto,
  defaultOptionsId: string,
  websiteGroups: IWebsiteInfoDto[]
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

  // eslint-disable-next-line no-restricted-syntax
  for (const group of websiteGroups) {
    const { accounts, displayName } = group;
    const selectedAccounts = accounts.filter((account) =>
      submission.options.some((option) => option.account === account.id)
    );
    if (selectedAccounts.length) {
      sidenavOptions.push({
        name: displayName,
        id: displayName,
        onClick: () => {
          scrollToAnchor(displayName);
        },
        items: selectedAccounts.map((account) => ({
          name: account.name,
          id: account.id,
          onClick: () => {
            scrollToAnchor(account.id);
          },
        })),
      });
    }
  }

  return sidenavOptions;
}

export default function SubmissionEditForm() {
  const { submission } = useSubmission();
  const { websites } = useWebsites();

  const defaultOptions = submission.getDefaultOptions();

  const sidenavOptions: EuiSideNavItemType<unknown>[] = getSideNav(
    submission,
    defaultOptions.id,
    websites
  );

  return (
    <div className="postybirb__submission-form">
      <div className="postybirb__submission-form-sections">
        <SubmissionFormSection>
          <SubmissionFormWebsiteSelect />
        </SubmissionFormSection>
        {/* <SubmissionFormSection key={defaultOptions.id}>
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
          ))} */}
      </div>
      <div className="postybirb__submission-form-navigator">
        <EuiSideNav items={sidenavOptions} />
      </div>
    </div>
  );
}
