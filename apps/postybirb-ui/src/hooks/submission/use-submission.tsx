import {
  IAccountDto,
  ISubmissionDto,
  IValidateWebsiteOptionsDto,
  SubmissionId,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { debounce } from 'lodash';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import submissionApi from '../../api/submission.api';
import websiteOptionsApi from '../../api/website-options.api';
import { useToast } from '../../app/app-toast-provider';
import { SubmissionValidationResult } from '../../components/submissions/submission-edit-form/submission-form-props';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { useUpdateView } from '../use-update-view';

export type SubmissionProviderContext = {
  submission: SubmissionDto;
  isChanged: boolean;
  isLoading: boolean;
  isSaving: boolean;
  validationResults: SubmissionValidationResult[];
  addWebsiteOption: (account: IAccountDto) => void;
  removeWebsiteOption: (option: WebsiteOptionsDto) => void;
  refetch: () => void;
  save: () => void;
  updateView: () => void;
};

export const SubmissionContext = createContext<SubmissionProviderContext>(
  {} as SubmissionProviderContext
);

function hasChanges(original?: SubmissionDto, update?: SubmissionDto): boolean {
  if (JSON.stringify(update?.metadata) !== JSON.stringify(original?.metadata)) {
    return true;
  }

  if (JSON.stringify(update?.options) !== JSON.stringify(original?.options)) {
    return true;
  }

  return false;
}

function useSubmissionInternal(id: SubmissionId): SubmissionProviderContext {
  const { addToast, addErrorToast } = useToast();
  const { data, refetch, ...query } = useQuery(
    [`submission-${id}`],
    () => submissionApi.get(id).then((value) => new SubmissionDto(value.body)),
    {
      refetchOnWindowFocus: false,
      cacheTime: 0,
    }
  );
  const submission = useMemo(
    () => data ?? new SubmissionDto({} as ISubmissionDto),
    [data]
  );
  const original = useMemo(() => submission?.copy(), [submission]);
  const updateView = useUpdateView();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { data: validationResults, refetch: fetchValidations } = useQuery(
    `validation-${id}`,
    () => {
      if (data) {
        return Promise.all(
          data.options
            .filter((o) => !o.isDefault)
            .map((o) => {
              const defaultOptions = data.getDefaultOptions();
              const dto: IValidateWebsiteOptionsDto = {
                submission: data.id,
                options: o.data,
                defaultOptions: defaultOptions?.data,
                account: o.account,
              };
              return websiteOptionsApi.validate(dto).then((res) => res.body);
            })
        ) as Promise<SubmissionValidationResult[]>;
      }

      return [];
    }
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const revalidate = useCallback(
    debounce(() => fetchValidations(), 1_500),
    [fetchValidations]
  );

  const addWebsiteOption = useCallback(
    (account: IAccountDto) => {
      submission.addOption({
        id: Date.now().toString(),
        account: account.id,
        data: {},
      } as WebsiteOptionsDto);
    },
    [submission]
  );

  const removeWebsiteOption = useCallback(
    (option: WebsiteOptionsDto) => {
      submission.removeOption(option);
    },
    [submission]
  );

  const { isLoading } = query;
  const isChanged: boolean = hasChanges(original, submission);

  const save = useCallback(() => {
    if (isChanged && !isSaving) {
      setIsSaving(true);
      const { id: submissionId, isScheduled, schedule } = submission;
      const deletedWebsiteOptions = original.options
        .filter(
          (originalOpt) =>
            !submission.options.some(
              (updatedOpt) => originalOpt.id === updatedOpt.id
            )
        )
        .map((o) => o.id);

      const newOrUpdatedOptions = submission.options;

      submissionApi
        .update(submissionId, {
          isScheduled,
          scheduledFor: schedule.scheduledFor,
          scheduleType: schedule.scheduleType,
          deletedWebsiteOptions,
          newOrUpdatedOptions,
          metadata: submission.metadata,
        })
        .then(() => {
          addToast({
            id: Date.now().toString(),
            color: 'success',
            text: (
              <FormattedMessage
                id="submission.save.success"
                defaultMessage="Submission saved"
              />
            ),
          });
          refetch();
        })
        .catch((err) => {
          addErrorToast(err);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  }, [
    addErrorToast,
    addToast,
    isChanged,
    isSaving,
    original.options,
    refetch,
    submission,
  ]);

  // TODO setMetadata -> update
  // TODO setWebsiteOption -> update

  return {
    submission,
    isChanged,
    isLoading,
    isSaving,
    validationResults: validationResults ?? [],
    addWebsiteOption,
    removeWebsiteOption,
    refetch,
    save,
    updateView,
  };
}

export function useSubmission() {
  return useContext(SubmissionContext);
}

export default function SubmissionProvider({
  children,
  id,
}: PropsWithChildren<{ id: SubmissionId }>) {
  const submissionState = useSubmissionInternal(id);
  return (
    <SubmissionContext.Provider value={submissionState}>
      {children}
    </SubmissionContext.Provider>
  );
}
