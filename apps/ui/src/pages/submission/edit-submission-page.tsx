/* eslint-disable no-nested-ternary */
import {
  EuiBreadcrumb,
  EuiButton,
  EuiButtonEmpty,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SubmissionType } from '@postybirb/types';
import { useMemo, useReducer } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router';
import SubmissionsApi from '../../api/submission.api';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import NotFound from '../not-found/not-found';
import { MessageSubmissionPath } from '../route-paths';

export default function EditSubmissionPage() {
  const { id } = useParams();
  const history = useNavigate();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const { data, isLoading, isFetching, refetch } = useQuery(
    [`submission-${id}`],
    () =>
      SubmissionsApi.get(id as string).then(
        (value) => new SubmissionDto(value.body)
      ),
    {
      refetchOnWindowFocus: false,
      cacheTime: 0,
    }
  );
  const original = useMemo(() => data?.copy(), [data]);

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
        style={{ position: 'sticky', top: 0 }}
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
          {
            items: [
              <EuiHeaderSection>
                <EuiHeaderSectionItem className="mr-1">
                  <EuiButtonEmpty
                    size="s"
                    color="ghost"
                    onClick={() => refetch()}
                  >
                    <FormattedMessage id="undo" defaultMessage="Undo" />
                  </EuiButtonEmpty>
                </EuiHeaderSectionItem>
                <EuiHeaderSectionItem>
                  <EuiButton
                    size="s"
                    disabled={JSON.stringify(data) === JSON.stringify(original)}
                  >
                    <FormattedMessage
                      id="submission.save"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiHeaderSectionItem>
              </EuiHeaderSection>,
            ],
          },
        ]}
      />
      <EuiSpacer />
      {isLoading || isFetching ? (
        <div className="w-full text-center">
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : data ? (
        <SubmissionEditForm
          submission={data}
          onUpdate={() => {
            forceUpdate();
          }}
        />
      ) : (
        <NotFound />
      )}
    </>
  );
}
