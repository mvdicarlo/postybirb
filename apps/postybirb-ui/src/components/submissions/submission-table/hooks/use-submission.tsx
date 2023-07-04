import { ISubmissionDto, IValidateWebsiteOptionsDto, SubmissionId } from '@postybirb/types';
import submissionApi from 'apps/postybirb-ui/src/api/submission.api';
import websiteOptionsApi from 'apps/postybirb-ui/src/api/website-options.api';
import { SubmissionDto } from 'apps/postybirb-ui/src/models/dtos/submission.dto';
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';
import { useQuery } from 'react-query';
import { SubmissionValidationResult } from '../../submission-edit-form/submission-form-props';
import { debounce } from 'lodash';

export type SubmissionProviderContext = {
    submission: SubmissionDto;
    isChanged: boolean;
    isLoading: boolean
    validationResults: SubmissionValidationResult[];
    refetch: () => void;
}

export const SubmissionContext = createContext<SubmissionProviderContext>({} as SubmissionProviderContext);

function hasChanges(original?: SubmissionDto, update?: SubmissionDto): boolean {
    if (
        JSON.stringify(update?.metadata) !== JSON.stringify(original?.metadata)
    ) {
        return true;
    }

    if (JSON.stringify(update?.options) !== JSON.stringify(original?.options)) {
        return true;
    }

    return false;
}

function useSubmissionInternal(id: SubmissionId): SubmissionProviderContext {
    const { data, refetch, ...query } = useQuery([`submission-${id}`],
        () => submissionApi.get(id).then((value) => new SubmissionDto(value.body)),
        {
            refetchOnWindowFocus: false,
            cacheTime: 0,
        });
    const submission = useMemo(() => data ?? new SubmissionDto({} as ISubmissionDto), [data]);
    const original = useMemo(() => submission?.copy(), [submission]);
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

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
    )

    const revalidate = useCallback(debounce(() => fetchValidations(), 1_500), [fetchValidations]);

    const isLoading: boolean = query.isFetching || query.isLoading;
    const isChanged: boolean = hasChanges(original, submission);

    // TODO setMetadata -> update
    // TODO setWebsiteOption -> update

    return { submission, isChanged, isLoading, validationResults: validationResults ?? [], refetch };
}

export function useSubmission() {
    return useContext(SubmissionContext);
}

export default function SubmissionProvider({ children, id }: PropsWithChildren<{ id: SubmissionId }>) {
    const submissionState = useSubmissionInternal(id);
    return <SubmissionContext.Provider value={submissionState}>{children}</SubmissionContext.Provider>;
}