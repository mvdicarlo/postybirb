import {
  IWebsiteFormFields,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../api/form-generator.api';
import { SubmissionValidationResult } from '../../components/submissions/submission-edit-form/submission-form-props';
import { AccountStore } from '../../stores/account.store';
import { useStore } from '../../stores/use-store';

export function useSubmissionOptions(
  option: WebsiteOptionsDto<IWebsiteFormFields>,
  type: SubmissionType,
  validationResults: SubmissionValidationResult[]
) {
  const { state: accounts } = useStore(AccountStore);

  const account = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => accounts.find((a) => a.id === option.account)!,
    [accounts, option.account]
  );

  const {
    data: form,
    isLoading: isLoadingQuery,
    isFetching,
  } = useQuery([option.id], () =>
    formGeneratorApi
      .getForm({
        accountId: option.account,
        type,
      })
      .then((res) => res.body)
  );

  const isLoading = isLoadingQuery || isFetching;
  const validations: SubmissionValidationResult = useMemo(
    () =>
      validationResults.find((v) => v.id === option.id) ??
      ({
        id: option.id,
        result: {},
      } as SubmissionValidationResult),
    [option.id, validationResults]
  );

  return { account, isLoading, form, validations };
}
