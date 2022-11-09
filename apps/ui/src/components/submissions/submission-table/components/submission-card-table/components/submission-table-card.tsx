import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPanel,
  EuiSplitPanel,
} from '@elastic/eui';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import {
  SquareCheckedIcon,
  SquareIcon,
} from '../../../../../../shared/icons/Icons';
import { getUrlSource } from '../../../../../../transports/https';
import { SubmissionTableCardEditableFields } from './submission-table-card-editable-fields';

type SubmissionCardOnSelect = (id: string) => void;

type SubmissionTableCardProps = {
  submission: SubmissionDto;
  onSelect: SubmissionCardOnSelect;
  selected: boolean;
};

export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission, selected, onSelect } = props;
  const { files } = submission;

  let img: string | undefined;
  if (files.length) {
    img = `${getUrlSource()}/api/file/thumbnail/${files[0].id}`;
  }
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
    </EuiSplitPanel.Outer>
  );
}
