/* eslint-disable no-nested-ternary */
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
import { IValidateSubmissionOptionsDto } from '@postybirb/dto';
import { SubmissionType } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router';
import SubmissionOptionsApi from '../../api/submission-options.api';
import SubmissionsApi from '../../api/submission.api';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionValidationResult } from '../../components/submissions/submission-edit-form/submission-form-props';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { AccountStore } from '../../stores/account.store';
import { useStore } from '../../stores/use-store';
import NotFound from '../not-found/not-found';
import { MessageSubmissionPath } from '../route-paths';

async function save(original: SubmissionDto, updated: SubmissionDto) {
  const { id, isScheduled, schedule } = updated;
  const deletedOptions = original.options.filter(
    (originalOpt) =>
      !updated.options.some((updatedOpt) => originalOpt.id === updatedOpt.id)
  );

  const newOrUpdatedOptions = updated.options;

  return SubmissionsApi.update({
    id,
    isScheduled,
    scheduledFor: schedule.scheduledFor,
    scheduleType: schedule.scheduleType,
    deletedOptions,
    newOrUpdatedOptions,
    metadata: updated.metadata,
  });
}

export default function EditSubmissionPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { id } = useParams();
  const history = useNavigate();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const { state: accounts, isLoading: isLoadingAccounts } =
    useStore(AccountStore);
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

  const { data: validationResults, refetch: refetchValidations } = useQuery(
    `validation-${id}`,
    () => {
      if (data) {
        return Promise.all(
          data.options
            .filter((o) => !o.isDefault)
            .map((o) => {
              const dto: IValidateSubmissionOptionsDto = {
                submissionId: data.id,
                options: o.data,
                defaultOptions: data.getDefaultOptions().data,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                accountId: o.account!.id!,
              };
              return SubmissionOptionsApi.validate(o.id, dto);
            })
        ) as Promise<SubmissionValidationResult[]>;
      }

      return [];
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedValidate = useCallback(
    debounce(() => refetchValidations(), 1_500),
    [refetchValidations]
  );

  const original = useMemo(() => data?.copy(), [data]);
  const onUpdate = useCallback(() => {
    forceUpdate();
    debouncedValidate();
  }, [debouncedValidate]);

  const defaultOption = data?.getDefaultOptions();
  const isLoadingData = isLoading || isFetching || isLoadingAccounts;

  const breadcrumbs: EuiBreadcrumb[] = useMemo(
    () => [
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
              <span>{defaultOption?.data.title}</span>
            ) : (
              <EuiLoadingSpinner />
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultOption?.data.title]
  );

  const editForm = isLoadingData ? (
    <div className="w-full text-center">
      <EuiLoadingSpinner size="xxl" />
    </div>
  ) : data ? (
    <SubmissionEditForm
      key={data?.id}
      submission={data}
      validation={validationResults ?? []}
      accounts={accounts.filter((account) =>
        account.websiteInfo.supports.includes(data.type)
      )}
      onUpdate={onUpdate}
    />
  ) : (
    <NotFound />
  );

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
                <EuiHeaderSectionItem>
                  <EuiButton
                    size="s"
                    disabled={
                      JSON.stringify(data) === JSON.stringify(original) ||
                      isSaving
                    }
                    isLoading={isSaving}
                    onClick={() => {
                      if (data && original) {
                        setIsSaving(true);
                        save(original, data)
                          .then(() => {
                            refetch();
                          })
                          .finally(() => {
                            setIsSaving(false);
                          });
                      }
                    }}
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
      <EuiSpacer size="m" />
      {editForm}
    </>
  );
}
