import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFormLabel,
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { SubmissionType } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { Trans } from '@lingui/macro';
import submissionsApi from '../../api/submission.api';
import { MessageIcon } from '../../components/shared/icons/Icons';
import SubmissionTemplateManagementView from '../../components/submission-templates/submission-template-management-view/submission-template-management-view';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

function isValidName(name: string): boolean {
  if (name && name.trim().length) {
    return true;
  }

  return false;
}

function createNewMessageSubmission(name: string) {
  return submissionsApi.createMessageSubmission(name);
}

function CreateMessageSubmissionForm(): JSX.Element {
  const [value, setValue] = useState('');

  return (
    <div>
      <EuiFieldText
        id="message-input"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Message submission name input"
        prepend={
          <EuiFormLabel htmlFor="message-input">
            <Trans context="name">Name</Trans>
          </EuiFormLabel>
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValidName(value)) {
            createNewMessageSubmission(value);
          }
        }}
        append={
          <EuiButtonIcon
            iconType="plus"
            aria-label="Create message submission button"
            disabled={!isValidName(value)}
            onClick={() => createNewMessageSubmission(value)}
          />
        }
      />
    </div>
  );
}

export default function MessageSubmissionManagementPage() {
  const { state, isLoading } = useStore(SubmissionStore);
  const [tab, setTab] = useState<'submissions' | 'templates'>('submissions');

  const messageSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.MESSAGE
  );

  const display = useMemo(
    () =>
      tab === 'submissions' ? (
        <>
          <CreateMessageSubmissionForm />
          <EuiSpacer />
          {isLoading ? (
            <EuiProgress size="xs" />
          ) : (
            <SubmissionTable submissions={messageSubmissions} />
          )}
        </>
      ) : (
        <SubmissionTemplateManagementView type={SubmissionType.MESSAGE} />
      ),
    [isLoading, messageSubmissions, tab]
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType={MessageIcon.Header}
        pageTitle={
          <Trans context="submissions.message-page-header">
            Message Submissions
          </Trans>
        }
        tabs={[
          {
            label: <Trans context="submissions">Submissions</Trans>,
            isSelected: tab === 'submissions',
            onClick: () => {
              setTab('submissions');
            },
          },
          {
            label: <Trans context="templates">Templates</Trans>,
            isSelected: tab === 'templates',
            onClick: () => {
              setTab('templates');
            },
          },
        ]}
      />
      <EuiSpacer />
      {display}
    </>
  );
}
