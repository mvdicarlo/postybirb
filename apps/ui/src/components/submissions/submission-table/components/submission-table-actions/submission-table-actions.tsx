import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

type SubmissionTableActionsProps = {
  selected: SubmissionDto[];
  onSelectAll: () => void;
};

// TODO action + deselect all
export function SubmissionTableActions(
  props: SubmissionTableActionsProps
): JSX.Element {
  const { selected, onSelectAll } = props;
  return (
    <>
      <EuiHeaderSectionItemButton>
        <EuiIcon type="stopFilled" onClick={() => onSelectAll()} />
      </EuiHeaderSectionItemButton>
      <EuiHeaderSectionItemButton>
        <EuiIcon type="trash" color="danger" />
      </EuiHeaderSectionItemButton>
    </>
  );
}
