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
import { IValidateWebsiteOptionsDto, SubmissionType } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router';
import submissionsApi from '../../api/submission.api';
import websiteOptionsApi from '../../api/website-options.api';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionValidationResult } from '../../components/submissions/submission-edit-form/submission-form-props';
import { useUpdateView } from '../../hooks/use-update-view';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { AccountStore } from '../../stores/account.store';
import { useStore } from '../../stores/use-store';
import NotFound from '../not-found/not-found';
import { MessageSubmissionPath } from '../route-paths';

function canSave(original?: SubmissionDto, updated?: SubmissionDto): boolean {
  if (
    JSON.stringify(updated?.metadata) !== JSON.stringify(original?.metadata)
  ) {
    return true;
  }

  if (JSON.stringify(updated?.options) !== JSON.stringify(original?.options)) {
    return true;
  }

  return false;
}

async function save(original: SubmissionDto, updated: SubmissionDto) {
  const { id, isScheduled, schedule } = updated;
  const deletedWebsiteOptions = original.options
    .filter(
      (originalOpt) =>
        !updated.options.some((updatedOpt) => originalOpt.id === updatedOpt.id)
    )
    .map((o) => o.id);

  const newOrUpdatedOptions = updated.options;

  return submissionsApi.update(id, {
    isScheduled,
    scheduledFor: schedule.scheduledFor,
    scheduleType: schedule.scheduleType,
    deletedWebsiteOptions,
    newOrUpdatedOptions,
    metadata: updated.metadata,
  });
}

export default function EditSubmissionPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { id } = useParams();
  const history = useNavigate();
  const updateView = useUpdateView();

  const { state: accounts, isLoading: isLoadingAccounts } =
    useStore(AccountStore);
  const { data, isLoading, isFetching, refetch } = useQuery(
    [`submission-${id}`],
    () =>
      submissionsApi
        .get(id as string)
        .then((value) => new SubmissionDto(value.body)),
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
    updateView();
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
                    disabled={!canSave(original, data) || isSaving}
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
