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
import { FormattedMessage } from 'react-intl';
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
          <FormattedMessage
            id="leave-modal.title"
            defaultMessage="You have unsaved changes"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>Are you sure you want to leave this page?</EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="danger" onClick={onCancel}>
          <FormattedMessage id="no" defaultMessage="No" />
        </EuiButton>
        <EuiButton onClick={onConfirm}>
          <FormattedMessage id="yes" defaultMessage="Yes" />
        </EuiButton>
        <EuiButton onClick={onSave}>
          <FormattedMessage
            id="leave-modal.save-first"
            defaultMessage="Save and Close"
          />
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
                      <FormattedMessage
                        id="submissions.edit-page-header-template"
                        defaultMessage="Edit Template"
                      />
                    ) : (
                      <FormattedMessage
                        id="submissions.edit-page-header"
                        defaultMessage="Edit Submission"
                      />
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
                    <FormattedMessage
                      id="import-template"
                      defaultMessage="Import Template"
                    />
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
                    <FormattedMessage
                      id="submission.save"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiHeaderSectionItem>
                <EuiHeaderSectionItem>
                  <EuiButtonIcon
                    aria-label="Close"
                    title="Close"
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
