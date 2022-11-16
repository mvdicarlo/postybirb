/* eslint-disable no-nested-ternary */
import { EuiLoadingSpinner, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { useParams } from 'react-router';
import SubmissionsApi from '../../api/submission.api';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import NotFound from '../not-found/not-found';

export default function EditSubmissionPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery(
    [id],
    () => SubmissionsApi.get(id || 'x').then((d) => d.body),
    {
      refetchOnWindowFocus: false,
    }
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType="documentEdit"
        pageTitle={
          <FormattedMessage
            id="submissions.edit-page-header"
            defaultMessage="Edit Submission"
          />
        }
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
