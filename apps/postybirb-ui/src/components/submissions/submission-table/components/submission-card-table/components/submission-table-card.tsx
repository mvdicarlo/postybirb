import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
  EuiToolTip,
} from '@elastic/eui';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router';
import submissionApi from '../../../../../../api/submission.api';
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

// TODO show issues with submission
export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission, selected, onSelect } = props;
  const { files } = submission;
  const history = useNavigate();

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
            aria-label={
              submission.schedule.scheduledFor
                ? 'Schedule submission'
                : 'Post submission'
            }
            onClick={() => {
              navToEdit(submission.id);
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
