import {
  EuiBreadcrumb,
  EuiButton,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import SubmissionProvider, {
  useSubmission,
} from '../../hooks/submission/use-submission';
import NotFound from '../not-found/not-found';
import { FileSubmissionPath, MessageSubmissionPath } from '../route-paths';

function EditSubmissionPageNavHeader() {
  const history = useNavigate();
  const { isLoading, isSaving, isChanged, submission, save } = useSubmission();
  const defaultOption = submission.getDefaultOptions();
  const breadcrumbs: EuiBreadcrumb[] = useMemo(
    () => [
      {
        text:
          submission.type === SubmissionType.FILE ? (
            <Trans>File Submissions</Trans>
          ) : (
            <Trans>Message Submissions</Trans>
          ),
        href: '#',
        onClick: (e) => {
          e.preventDefault();
          history(
            submission.type === SubmissionType.FILE
              ? FileSubmissionPath
              : MessageSubmissionPath
          );
        },
      },
      {
        text: (
          <div>
            <span>{defaultOption.data.title}</span>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultOption.data.title]
  );

  return (
    <EuiHeader
      style={{ position: 'sticky', top: 0 }}
      sections={[
        {
          items: [
            <EuiHeaderLogo iconType="documentEdit" />,
            <EuiHeaderSection>
              <EuiTitle size="xs">
                <h4>
                  <Trans context="submissions.edit-page-header">
                    Edit Submission
                  </Trans>
                </h4>
              </EuiTitle>
            </EuiHeaderSection>,
          ],
          breadcrumbs,
          breadcrumbProps: {
            lastBreadcrumbIsCurrentPage: true,
          },
        },
        {
          items: [
            <EuiHeaderSection>
              <EuiHeaderSectionItem>
                <EuiButton
                  size="s"
                  disabled={!isChanged || isSaving}
                  isLoading={isSaving || isLoading}
                  onClick={() => {
                    save();
                  }}
                >
                  <Trans>Save</Trans>
                </EuiButton>
              </EuiHeaderSectionItem>
            </EuiHeaderSection>,
          ],
        },
      ]}
    />
  );
}

function EditSubmissionTemplatePageInternal() {
  const { isLoading } = useSubmission();

  return (
    <div className="postybirb__submission-edit-page">
      <EditSubmissionPageNavHeader />
      <EuiSpacer size="m" />
      {isLoading ? (
        <div className="w-full text-center">
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : (
        <SubmissionEditForm />
      )}
    </div>
  );
}

export default function EditSubmissionTemplatePage() {
  const { id } = useParams();

  if (!id) {
    return <NotFound />;
  }

  return (
    <SubmissionProvider id={id}>
      <EditSubmissionTemplatePageInternal />
    </SubmissionProvider>
  );
}
