import {
    AccountId,
    IWebsiteFormFields,
    WebsiteOptionsDto,
} from '@postybirb/types';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { WebsiteSelect } from './website-select';

type ImplementedWebsiteSelectProps = {
  submission: SubmissionDto;
};

export function ImplementedWebsiteSelect(props: ImplementedWebsiteSelectProps) {
  const { submission } = props;
  return (
    <WebsiteSelect
      submission={submission}
      onSelect={(selectedAccounts) => {
        const existingOptions = submission.options.filter((o) => !o.isDefault);
        const removedOptions: WebsiteOptionsDto[] = [];
        const newAccounts: AccountId[] = [];
        selectedAccounts.forEach((account) => {
          const exists = existingOptions.find(
            (o) => o.accountId === account.id,
          );
          if (!exists) {
            newAccounts.push(account.id);
          }
        });
        existingOptions.forEach((option) => {
          const exists = selectedAccounts.find(
            (a) => a.id === option.accountId,
          );
          if (!exists) {
            removedOptions.push(option);
          }
        });
        websiteOptionsApi.updateSubmissionOptions(submission.id, {
          remove: removedOptions.map((o) => o.id),
          add: newAccounts.map((accountId) => ({
            accountId,
            submissionId: submission.id,
            data: {} as IWebsiteFormFields,
          })),
        });
      }}
    />
  );
}
