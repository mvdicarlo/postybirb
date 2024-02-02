import {
  EuiBreadcrumb,
  EuiButton,
  EuiButtonIcon,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SubmissionType, WebsiteOptionsDto } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { Trans } from '@lingui/macro';
import { useNavigate, useParams } from 'react-router';
import ReactRouterPrompt from 'react-router-prompt';
import TemplatePickerModal from '../../components/submission-templates/template-picker-modal/template-picker-modal';
import SubmissionEditForm from '../../components/submissions/submission-edit-form/submission-edit-form';
import SubmissionProvider, {
  useSubmission,
} from '../../hooks/submission/use-submission';
import NotFound from '../not-found/not-found';
import { FileSubmissionPath, MessageSubmissionPath } from '../route-paths';

function BlockModal({
  onCancel,
  onConfirm,
  onSave,
}: {
  onCancel(): void;
  onConfirm(): void;
  onSave(): void;
}) {
  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <Trans context="unsaved changes modal">
            You have unsaved changes
          </Trans>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <Trans context="unsaved changes modal">
          Are you sure you want to leave this page?
        </Trans>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="danger" onClick={onCancel}>
          <Trans context="unsaved changes modal">No</Trans>
        </EuiButton>
        <EuiButton onClick={onConfirm}>
          <Trans context="unsaved changes modal">Yes</Trans>
        </EuiButton>
        <EuiButton onClick={onSave}>
          <Trans context="unsaved changes modal">Save and Close</Trans>
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function EditSubmissionPageNavHeader() {
  const history = useNavigate();
  const [importTemplateVisible, setImportTemplateVisible] = useState(false);
  const { isLoading, isSaving, isChanged, submission, save, updateView } =
    useSubmission();
  const defaultOption = submission.getDefaultOptions();

  const navBack = () => {
    history(
      submission.type === SubmissionType.FILE
        ? FileSubmissionPath
        : MessageSubmissionPath
    );
  };

  const breadcrumbs: EuiBreadcrumb[] = useMemo(
    () => [
      {
        text:
          submission.type === SubmissionType.FILE ? (
            <Trans>File Submissions</Trans>
          ) : (
            <Trans>Message Submissions</Trans>
          ),
        href: '#',
        onClick: (e) => {
          e.preventDefault();
          navBack();
        },
      },
      {
        text: (
          <div>
            <span>{defaultOption.data.title}</span>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultOption.data.title]
  );

  return (
    <>
      <ReactRouterPrompt when={isChanged}>
        {({ isActive, onConfirm, onCancel }) => {
          if (isActive) {
            return (
              <BlockModal
                onCancel={onCancel}
                onConfirm={onConfirm}
                onSave={() => {
                  save();
                  onConfirm();
                }}
              />
            );
          }
          return null;
        }}
      </ReactRouterPrompt>
      {importTemplateVisible ? (
        <TemplatePickerModal
          submissionId={submission.id}
          type={submission.type}
          onApply={(options) => {
            options.forEach((option) => {
              const existingOption = submission.options.find(
                (o) => o.account === option.account
              );
              if (existingOption) {
                existingOption.data = {
                  ...existingOption.data,
                  ...option.data,
                };
              } else {
                submission.addOption({
                  id: Date.now().toString(),
                  account: option.account,
                  data: option.data,
                } as WebsiteOptionsDto);
              }
            });
            setImportTemplateVisible(false);
            updateView();
          }}
          onClose={() => {
            setImportTemplateVisible(false);
          }}
        />
      ) : null}
      <EuiHeader
        style={{ position: 'sticky', top: 0 }}
        sections={[
          {
            items: [
              <EuiHeaderLogo iconType="documentEdit" />,
              <EuiHeaderSection>
                <EuiTitle size="xs">
                  <h4>
                    {submission.isTemplate() ? (
                      <Trans>Edit Template</Trans>
                    ) : (
                      <Trans>Edit Submission</Trans>
                    )}
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
                    color="text"
                    onClick={() => {
                      setImportTemplateVisible(true);
                    }}
                  >
                    <Trans>Import Template</Trans>
                  </EuiButton>
                </EuiHeaderSectionItem>
                <EuiHeaderSectionItem>
                  <EuiButton
                    className="ml-2"
                    size="s"
                    disabled={!isChanged || isSaving}
                    isLoading={isSaving || isLoading}
                    onClick={() => {
                      save();
                    }}
                  >
                    <Trans>Save</Trans>
                  </EuiButton>
                </EuiHeaderSectionItem>
                <EuiHeaderSectionItem>
                  <EuiButtonIcon
                    aria-label="Close"
                    color="danger"
                    iconType="cross"
                    className="ml-2"
                    size="s"
                    isLoading={isSaving || isLoading}
                    onClick={() => {
                      navBack();
                    }}
                  />
                </EuiHeaderSectionItem>
              </EuiHeaderSection>,
            ],
          },
        ]}
      />
    </>
  );
}

function EditSubmissionPageInternal() {
  const { isLoading } = useSubmission();

  return (
    <div className="postybirb__submission-edit-page">
      <EditSubmissionPageNavHeader />
      <EuiSpacer size="m" />
      {isLoading ? (
        <div className="w-full text-center">
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : (
        <SubmissionEditForm />
      )}
    </div>
  );
}

export default function EditSubmissionPage() {
  const { id } = useParams();

  if (!id) {
    return <NotFound />;
  }

  return (
    <SubmissionProvider id={id}>
      <EditSubmissionPageInternal />
    </SubmissionProvider>
  );
}
