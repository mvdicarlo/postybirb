import { EuiSideNav, EuiSideNavItemType, EuiTitle } from '@elastic/eui';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  IAccountDto,
  IWebsiteFormFields,
  IWebsiteInfoDto,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { useMemo } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { useSubmission } from '../../../hooks/submission/use-submission';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import SubmissionScheduler from '../submission-scheduler/submission-scheduler';
import SubmissionFileSection from './components/submission-file-section/submission-file-section';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import { SubmissionFormWebsiteSelect } from './components/submission-form-website-select/submission-form-website-select';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';

type PairedWebsiteOptions = {
  website: IWebsiteInfoDto;
  pairs: {
    account: IAccountDto;
    option: WebsiteOptionsDto<IWebsiteFormFields>;
  }[];
};

function scrollToAnchor(anchorId: string): void {
  // eslint-disable-next-line lingui/text-restrictions
  const anchor = document.querySelector(`[data-anchor='${anchorId}']`);
  if (anchor) {
    anchor.scrollIntoView();
  }
}

function getSideNav(
  submission: SubmissionDto,
  defaultOptionsId: string,
  websiteGroups: PairedWebsiteOptions[],
  _: ReturnType<typeof useLingui>['_']
): EuiSideNavItemType<unknown>[] {
  const sidenavOptions: EuiSideNavItemType<unknown>[] = [
    {
      name: _(msg`Default Options`),
      id: defaultOptionsId,
      onClick: () => {
        scrollToAnchor(defaultOptionsId);
      },
    },
  ];

  for (const group of websiteGroups) {
    const { website, pairs } = group;
    const { displayName } = website;
    if (pairs.length) {
      sidenavOptions.push({
        name: displayName,
        id: displayName,
        onClick: () => {
          scrollToAnchor(displayName);
        },
        items: pairs.map(({ account }) => ({
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
  const { submission, validationResults, updateView } = useSubmission();
  const { websites } = useWebsites();

  const defaultOptions = submission.getDefaultOptions();

  const selectedWebsites = useMemo(() => {
    const selectedWebsiteOptions: PairedWebsiteOptions[] = [];
    for (const group of websites) {
      const { accounts } = group;
      const selectedAccountPairs = accounts
        .map((account) => ({
          account,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          option: submission.options.find(
            (option) => option.account === account.id
          )!,
        }))
        .filter(({ option }) => !!option);
      if (selectedAccountPairs.length) {
        selectedWebsiteOptions.push({
          website: group,
          pairs: selectedAccountPairs,
        });
      }
    }

    return selectedWebsiteOptions.sort((a, b) =>
      a.website.displayName.localeCompare(b.website.displayName)
    );
  }, [submission.options, websites]);

  const { _ } = useLingui();

  const sidenavOptions: EuiSideNavItemType<unknown>[] = getSideNav(
    submission,
    defaultOptions.id,
    selectedWebsites,
    _
  );

  const optionSections = selectedWebsites.map(({ website, pairs }) => (
    <SubmissionFormSection key={website.displayName}>
      <EuiTitle size="s">
        <h4 data-anchor={website.displayName}>{website.displayName}</h4>
      </EuiTitle>
      {pairs.map(({ option }) => (
        <SubmissionOptionsSection
          key={option.id}
          option={option}
          defaultOption={defaultOptions}
          validation={validationResults}
        />
      ))}
    </SubmissionFormSection>
  ));

  const isTemplate = submission.isTemplate();
  const fileSection = useMemo(
    () =>
      submission.type === SubmissionType.FILE && !isTemplate ? (
        <SubmissionFormSection>
          <SubmissionFileSection />
        </SubmissionFormSection>
      ) : null,
    [submission.type, isTemplate]
  );

  return (
    <div className="postybirb__submission-form">
      <div className="postybirb__submission-form-sections">
        {fileSection}
        <SubmissionFormSection>
          <SubmissionFormWebsiteSelect />
        </SubmissionFormSection>
        <SubmissionFormSection>
          <EuiTitle size="xs">
            <h4 data-anchor={defaultOptions.id}>
              <Trans>Schedule</Trans>
            </h4>
          </EuiTitle>
          <SubmissionScheduler
            schedule={submission.schedule}
            onChange={(updatedSchedule) => {
              submission.schedule = updatedSchedule;
              updateView();
            }}
          />
        </SubmissionFormSection>
        <SubmissionFormSection key={defaultOptions.id}>
          <EuiTitle size="s">
            <h4 data-anchor={defaultOptions.id}>
              <Trans>Default Options</Trans>
            </h4>
          </EuiTitle>
          <SubmissionOptionsSection
            option={defaultOptions}
            defaultOption={defaultOptions}
            validation={validationResults}
          />
        </SubmissionFormSection>
        {optionSections}
      </div>
      <div className="postybirb__submission-form-navigator">
        <EuiSideNav items={sidenavOptions} />
      </div>
    </div>
  );
}
