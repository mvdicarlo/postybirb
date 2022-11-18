/* eslint-disable no-nested-ternary */
import {
  EuiBreadcrumb,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import NotFound from '../not-found/not-found';
import { MessageSubmissionPath } from '../route-paths';

export default function EditSubmissionPage() {
  const { id } = useParams();
  const { state, isLoading } = useStore(SubmissionStore);
  const history = useNavigate();
  const data = state.find((s) => s.id === id);
  // eslint-disable-next-line react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars
  const original = useMemo(() => data, [data?.id]);

  const breadcrumbs: EuiBreadcrumb[] = [
    {
      text:
        data && data.type === SubmissionType.FILE ? (
          <FormattedMessage
            id="file-submissions"
            defaultMessage="File Submissions"
          />
        ) : (
          <FormattedMessage
            id="message-submissions"
            defaultMessage="Message Submissions"
          />
        ),
      href: '#',
      onClick: (e) => {
        e.preventDefault();
        history(MessageSubmissionPath);
      },
    },
    {
      text: (
        <div>
          {data ? (
            <span>{data.getDefaultOptions().data.title}</span>
          ) : (
            <EuiLoadingSpinner />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <EuiHeader
        sections={[
          {
            items: [
              <EuiHeaderLogo iconType="documentEdit" />,
              <EuiHeaderSection>
                <EuiTitle size="xs">
                  <h4>
                    <FormattedMessage
                      id="submissions.edit-page-header"
                      defaultMessage="Edit Submission"
                    />
                  </h4>
                </EuiTitle>
              </EuiHeaderSection>,
            ],
            breadcrumbs,
            breadcrumbProps: {
              lastBreadcrumbIsCurrentPage: true,
            },
          },
        ]}
      />
      <EuiSpacer />
      {isLoading ? (
        <div className="w-full text-center">
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : data ? (
        <SubmissionEditForm submission={data} />
      ) : (
        <NotFound />
      )}
    </>
  );
}
