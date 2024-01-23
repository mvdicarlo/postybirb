import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router';
import postApi from '../../../../../../api/post.api';
import submissionApi from '../../../../../../api/submission.api';
import { useToast } from '../../../../../../app/app-toast-provider';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../../../../pages/route-paths';
import {
  CancelIcon,
  CancelScheduleIcon,
  ScheduleIcon,
  SendIcon,
} from '../../../../../shared/icons/Icons';

type SubmissionTableCardActionsProps = {
  submission: SubmissionDto;
  canPost: boolean;
};

function ScheduleAction(props: SubmissionTableCardActionsProps) {
  const { submission, canPost } = props;
  const { addToast, addErrorToast } = useToast();

  if (!submission.schedule.scheduledFor) {
    return null;
  }

  return submission.isScheduled ? (
    <EuiToolTip
      content={
        <FormattedMessage id="unschedule" defaultMessage="Cancel schedule" />
      }
    >
      <EuiButtonIcon
        iconType={CancelScheduleIcon}
        color="warning"
        aria-label="Unschedule submission"
        onClick={() => {
          if (submission.isScheduled) {
            submissionApi
              .update(submission.id, {
                metadata: submission.metadata,
                ...submission.schedule,
                isScheduled: false,
                newOrUpdatedOptions: [],
                deletedWebsiteOptions: [],
              })
              .then(() => {
                addToast({
                  id: Date.now().toString(),
                  color: 'success',
                  title: (
                    <FormattedMessage
                      id="submission.unscheduled"
                      defaultMessage="Submission schedule cancelled"
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
  ) : (
    <EuiToolTip
      content={<FormattedMessage id="schedule" defaultMessage="Schedule" />}
    >
      <EuiButtonIcon
        iconType={ScheduleIcon}
        color="success"
        disabled={!canPost || submission.isScheduled || submission.isQueued()}
        aria-label="Schedule submission"
        onClick={() => {
          if (canPost && !submission.isScheduled) {
            submissionApi
              .update(submission.id, {
                metadata: submission.metadata,
                ...submission.schedule,
                isScheduled: true,
                newOrUpdatedOptions: [],
                deletedWebsiteOptions: [],
              })
              .then(() => {
                addToast({
                  id: Date.now().toString(),
                  color: 'success',
                  title: (
                    <FormattedMessage
                      id="submission.scheduled"
                      defaultMessage="Submission scheduled"
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
  );
}

function PostSubmissionAction(props: SubmissionTableCardActionsProps) {
  const { submission, canPost } = props;
  const { addToast, addErrorToast } = useToast();
  const isQueued = submission.isQueued();

  return isQueued ? (
    <EuiToolTip
      content={<FormattedMessage id="cancel" defaultMessage="Cancel post" />}
    >
      <EuiButtonIcon
        iconType={CancelIcon}
        color="warning"
        aria-label="Cancel submission"
        onClick={() => {
          postApi
            .dequeue([submission.id])
            .then(() => {
              addToast({
                id: Date.now().toString(),
                color: 'success',
                title: (
                  <FormattedMessage
                    id="submission.dequeued"
                    defaultMessage="Submission cancelled"
                  />
                ),
              });
            })
            .catch((res) => {
              addErrorToast(res);
            });
        }}
      />
    </EuiToolTip>
  ) : (
    <EuiToolTip content={<FormattedMessage id="post" defaultMessage="Post" />}>
      <EuiButtonIcon
        iconType={SendIcon}
        color="success"
        disabled={!canPost}
        aria-label="Post submission"
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
  );
}

export default function SubmissionTableCardActions(
  props: SubmissionTableCardActionsProps
) {
  const { submission, canPost } = props;
  const { addToast, addErrorToast } = useToast();

  const history = useNavigate();
  const navToEdit = useCallback(
    (id: string) => {
      history(`${EditSubmissionPath}/${id}`);
    },
    [history]
  );

  return (
    <>
      <PostSubmissionAction {...props} />
      <ScheduleAction {...props} />
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
        content={<FormattedMessage id="duplicate" defaultMessage="Duplicate" />}
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
    </>
  );
}
