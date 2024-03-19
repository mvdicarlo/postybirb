import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
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
    <EuiButtonEmpty
      iconType={CancelIcon}
      color="warning"
      size="s"
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
    >
      {_(msg`Cancel post`)}
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty
      iconType={SendIcon}
      size="s"
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
    >
      {_(msg`Post`)}
    </EuiButtonEmpty>
  );
}

export default function SubmissionTableCardActions(
  props: SubmissionTableCardActionsProps
) {
  const { submission } = props;
  const { _ } = useLingui();

  const history = useNavigate();
  const navToEdit = useCallback(
    (id: string) => {
      history(`${EditSubmissionPath}/${id}`);
    },
    [history]
  );

  return (
    <div className="postybirb__submission-card-actions">
      <div>
        <PostSubmissionAction {...props} />
      </div>
      <div>
        <ScheduleAction {...props} />
      </div>
      <div>
        <EuiButtonEmpty
          size="s"
          iconType="documentEdit"
          aria-label={_(msg`Edit Submission`)}
          onClick={() => {
            navToEdit(submission.id);
          }}
        >
          {_(msg`Edit`)}
        </EuiButtonEmpty>
      </div>
      <div>
        <EuiButtonEmpty
          iconType="listAdd"
          color="accent"
          size="s"
          aria-label={_(msg`Duplicate submission`)}
          onClick={() => {
            submissionApi.duplicate(submission.id);
          }}
        >
          {_(msg`Duplicate`)}
        </EuiButtonEmpty>
      </div>
    </div>
  );
}
