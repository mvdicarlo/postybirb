import {
  ISubmissionDto,
  IValidateWebsiteOptionsDto,
  SubmissionId,
} from '@postybirb/types';
import { debounce } from 'lodash';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useQuery } from 'react-query';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import { useUpdateView } from '../../../../hooks/use-update-view';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { SubmissionValidationResult } from '../../submission-edit-form/submission-form-props';

export type SubmissionProviderContext = {
  submission: SubmissionDto;
  isChanged: boolean;
  isLoading: boolean;
  validationResults: SubmissionValidationResult[];
  refetch: () => void;
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

  const { data: validationResults, refetch: fetchValidations } = useQuery(
    `validation-${id}`,
    () => {
      if (data) {
        return Promise.all(
          data.options
            .filter((o) => !o.isDefault)
            .map((o) => {
              const dto: IValidateWebsiteOptionsDto = {
                submission: data.id,
                options: o.data,
                defaultOptions: data.getDefaultOptions().data,
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

  const isLoading: boolean = query.isFetching || query.isLoading;
  const isChanged: boolean = hasChanges(original, submission);

  // TODO setMetadata -> update
  // TODO setWebsiteOption -> update

  return {
    submission,
    isChanged,
    isLoading,
    validationResults: validationResults ?? [],
    refetch,
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
