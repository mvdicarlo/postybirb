import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import {
  SquareFilledIcon,
  SquareIcon,
  SquareMinusIcon,
} from '../../../../../shared/icons/Icons';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

type SubmissionTableActionsProps = {
  selected: SubmissionDto[];
  submissions: SubmissionDto[];
  onSelectAll: () => void;
  onUnselectAll: () => void;
};

export function SubmissionTableActions(
  props: SubmissionTableActionsProps
): JSX.Element {
  const { selected, submissions, onSelectAll, onUnselectAll } = props;

  let selectBtn: JSX.Element = (
    <EuiHeaderSectionItemButton onClick={() => onSelectAll()}>
      <EuiIcon type={SquareIcon.Medium} />
    </EuiHeaderSectionItemButton>
  );
  if (selected.length === submissions.length) {
    selectBtn = (
      <EuiHeaderSectionItemButton onClick={() => onUnselectAll()}>
        <EuiIcon type={SquareFilledIcon.Medium} />
      </EuiHeaderSectionItemButton>
    );
  } else if (selected.length && selected.length !== submissions.length) {
    selectBtn = (
      <EuiHeaderSectionItemButton onClick={() => onSelectAll()}>
        <EuiIcon type={SquareMinusIcon.Medium} />
      </EuiHeaderSectionItemButton>
    );
  }

  return (
    <>
      {selectBtn}
      <EuiHeaderSectionItemButton
        color="danger"
        notification={selected.length}
        disabled={selected.length === 0}
      >
        <EuiIcon type="trash" />
      </EuiHeaderSectionItemButton>
    </>
  );
}
