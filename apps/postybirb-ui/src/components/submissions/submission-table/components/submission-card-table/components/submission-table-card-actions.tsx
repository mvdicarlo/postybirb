import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useCallback } from 'react';
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
  const { _ } = useLingui();

  if (!submission.schedule.scheduledFor) {
    return null;
  }

  return submission.isScheduled ? (
    <EuiToolTip content={_(msg`Cancel schedule`)}>
      <EuiButtonIcon
        iconType={CancelScheduleIcon}
        color="warning"
        aria-label={_(msg`Unschedule submission`)}
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
                  title: _(msg`Submission schedule cancelled`),
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
    <EuiToolTip content={_(msg`Schedule`)}>
      <EuiButtonIcon
        iconType={ScheduleIcon}
        color="success"
        disabled={!canPost || submission.isScheduled || submission.isQueued()}
        aria-label={_(msg`Schedule Submission`)}
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
                  title: _(msg`Submission scheduled`),
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
  const { _ } = useLingui();

  return isQueued ? (
    <EuiToolTip content={_(msg`Cancel post`)}>
      <EuiButtonIcon
        iconType={CancelIcon}
        color="warning"
        aria-label={_(msg`Cancel post`)}
        onClick={() => {
          postApi
            .dequeue([submission.id])
            .then(() => {
              addToast({
                id: Date.now().toString(),
                color: 'success',
                title: _(msg`Submission cancelled`),
              });
            })
            .catch((res) => {
              addErrorToast(res);
            });
        }}
      />
    </EuiToolTip>
  ) : (
    <EuiToolTip content={_(msg`Post`)}>
      <EuiButtonIcon
        iconType={SendIcon}
        color="success"
        disabled={!canPost}
        aria-label={_(msg`Post submission`)}
        onClick={() => {
          if (canPost) {
            postApi
              .enqueue([submission.id])
              .then(() => {
                addToast({
                  id: Date.now().toString(),
                  color: 'success',
                  title: _(msg`Submission queued for posting`),
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
  const { _ } = useLingui();

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
      <EuiToolTip content={_(msg`Edit`)}>
        <EuiButtonIcon
          iconType="documentEdit"
          aria-label={_(msg`Edit Submission`)}
          onClick={() => {
            navToEdit(submission.id);
          }}
        />
      </EuiToolTip>
      <EuiToolTip content={_(msg`Duplicate`)}>
        <EuiButtonIcon
          iconType="listAdd"
          color="accent"
          aria-label={_(msg`Duplicate submission`)}
          onClick={() => {
            submissionApi.duplicate(submission.id);
          }}
        />
      </EuiToolTip>
    </>
  );
}
