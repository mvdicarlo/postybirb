import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router';
import postApi from '../../../../../../api/post.api';
import submissionApi from '../../../../../../api/submission.api';
import websiteOptionsApi from '../../../../../../api/website-options.api';
import { useToast } from '../../../../../../app/app-toast-provider';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../../../../pages/route-paths';
import { defaultTargetProvider } from '../../../../../../transports/http-client';
import {
  ScheduleIcon,
  SendIcon,
  SquareCheckedIcon,
  SquareIcon,
} from '../../../../../shared/icons/Icons';
import { SubmissionTableCardEditableFields } from './submission-table-card-editable-fields';

type SubmissionCardOnSelect = (id: string) => void;

type SubmissionTableCardProps = {
  submission: SubmissionDto;
  onSelect: SubmissionCardOnSelect;
  selected: boolean;
};

function SubmissionCardValidationStatus(props: {
  hasErrors: boolean;
  hasWarnings: boolean;
}) {
  const { hasErrors, hasWarnings } = props;
  if (hasErrors) {
    return (
      <EuiText color="danger" size="xs" className="text-center">
        <EuiIcon type="alert" color="danger" className="mr-1" />
        <FormattedMessage
          id="submission.card.errors"
          defaultMessage="Incomplete submission"
        />
      </EuiText>
    );
  }

  if (hasWarnings) {
    return (
      <EuiText color="warning" size="xs" className="text-center">
        <EuiIcon type="warning" color="warning" className="mr-1" />
        <FormattedMessage
          id="submission.card.warning"
          defaultMessage="Submission has warnings"
        />
      </EuiText>
    );
  }

  return null;
}

export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission, selected, onSelect } = props;
  const { files } = submission;
  const history = useNavigate();
  const { addToast, addErrorToast } = useToast();
  const { data: validationResult } = useQuery(
    `submission-validation-${submission.id}`,
    () =>
      websiteOptionsApi.validateSubmission(submission.id).then((res) => {
        let hasErrors = false;
        let hasWarnings = false;
        if (res.status === 200) {
          res.body.forEach((validation) => {
            if (validation.errors?.length) {
              hasErrors = true;
            }
            if (validation.warnings?.length) {
              hasWarnings = true;
            }
          });
        }
        return {
          hasErrors,
          hasWarnings,
        };
      })
  );

  const validationStatus = validationResult ?? {
    hasErrors: false,
    hasWarnings: false,
  };

  let img: string | undefined;
  if (files.length) {
    img = `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`;
  }

  const navToEdit = useCallback(
    (id: string) => {
      history(`${EditSubmissionPath}/${id}`);
    },
    [history]
  );

  const canPost =
    !validationStatus.hasErrors &&
    submission.options.length > 1 &&
    submission.posts.length === 0;

  return (
    <EuiSplitPanel.Outer
      className="postybirb__submission-card"
      direction="row"
      style={{
        border: selected ? '1px solid rgb(54, 162, 239)' : undefined,
      }}
    >
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        className="postybirb__submission-card-selection-area"
        tabIndex={0}
        onClickCapture={() => {
          onSelect(submission.id);
        }}
        onKeyDownCapture={(event) => {
          if (event.code === 'Space' || event.code === 'Enter') {
            onSelect(submission.id);
          }
        }}
      >
        <EuiIcon type={selected ? SquareCheckedIcon : SquareIcon} />
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner paddingSize="none">
        <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            {img ? (
              <EuiImage allowFullScreen alt="image" src={img} />
            ) : (
              <div style={{ display: 'none' }} />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <SubmissionCardValidationStatus {...validationStatus} />
            <SubmissionTableCardEditableFields submission={submission} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner
        grow={false}
        className="postybirb__submission-card-actions"
      >
        <EuiToolTip
          content={
            submission.schedule.scheduledFor ? (
              <FormattedMessage id="schedule" defaultMessage="Schedule" />
            ) : (
              <FormattedMessage id="post" defaultMessage="Post" />
            )
          }
        >
          <EuiButtonIcon
            iconType={
              submission.schedule.scheduledFor ? ScheduleIcon : SendIcon
            }
            color="success"
            disabled={!canPost}
            aria-label={
              submission.schedule.scheduledFor
                ? 'Schedule submission'
                : 'Post submission'
            }
            onClick={() => {
              if (canPost) {
                postApi
                  .enqueue([submission.id])
                  .then(() => {
                    addToast({
                      id: Date.now().toString(),
                      color: 'success',
                      title: (
                        <FormattedMessage
                          id="submission.enqueued"
                          defaultMessage="Submission queued for posting"
                        />
                      ),
                    });
                  })
                  .catch((res) => {
                    addErrorToast(res);
                  });
              }
            }}
          />
        </EuiToolTip>
        <EuiToolTip
          content={<FormattedMessage id="edit" defaultMessage="Edit" />}
        >
          <EuiButtonIcon
            iconType="documentEdit"
            aria-label="Edit submission"
            onClick={() => {
              navToEdit(submission.id);
            }}
          />
        </EuiToolTip>
        <EuiToolTip
          content={
            <FormattedMessage id="duplicate" defaultMessage="Duplicate" />
          }
        >
          <EuiButtonIcon
            iconType="listAdd"
            color="accent"
            aria-label="Duplicate submission"
            onClick={() => {
              submissionApi.duplicate(submission.id);
            }}
          />
        </EuiToolTip>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
