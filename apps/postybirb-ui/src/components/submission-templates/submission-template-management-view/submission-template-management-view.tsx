import { SubmissionType } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import submissionTemplatesApi from '../../../api/submission-templates.api';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { useStore } from '../../../stores/use-store';
import CRUDTable from '../../shared/crud-table/crud-table';

type SubmissionTemplateManagementViewProps = {
  type: SubmissionType;
};

export default function SubmissionTemplateManagementView(
  props: SubmissionTemplateManagementViewProps
) {
  const { type } = props;
  const { state, isLoading } = useStore(SubmissionTemplateStore);
  const templates = state.filter((t) => t.type === type);

  return (
    <CRUDTable
      isLoading={isLoading}
      records={templates}
      columns={[
        {
          field: 'name',
          name: <FormattedMessage id="name" defaultMessage="Name" />,
        },
      ]}
      onCreate={() => {
        submissionTemplatesApi.create({
          name: `Submission Template ${Date.now()}`,
          type,
        });
      }}
      onDelete={(ids) => submissionTemplatesApi.remove(ids)}
    />
  );
}
