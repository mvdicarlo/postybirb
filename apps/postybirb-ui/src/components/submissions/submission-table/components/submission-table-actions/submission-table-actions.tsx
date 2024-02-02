import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { HttpResponse } from '../../../../../transports/http-client';
import DeleteActionPopover from '../../../../shared/delete-action-popover/delete-action-popover';
import {
  SquareFilledIcon,
  SquareIcon,
  SquareMinusIcon,
} from '../../../../shared/icons/Icons';

type SubmissionTableActionsProps = {
  selected: SubmissionDto[];
  submissions: SubmissionDto[];
  onSelectAll: () => void;
  onUnselectAll: () => void;
  onDeleteSelected: (selected: SubmissionDto[]) => void;
};

export function SubmissionTableActions(
  props: SubmissionTableActionsProps
): JSX.Element {
  const {
    selected,
    submissions,
    onSelectAll,
    onUnselectAll,
    onDeleteSelected,
  } = props;

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
      <DeleteActionPopover
        onDelete={() => {
          onDeleteSelected(selected);
          return Promise.resolve<HttpResponse<{ success: boolean }>>({
            body: { success: true },
          } as HttpResponse<{ success: boolean }>);
        }}
      >
        <EuiHeaderSectionItemButton
          color="danger"
          notification={selected.length}
          disabled={selected.length === 0}
        >
          <EuiIcon type="trash" />
        </EuiHeaderSectionItemButton>
      </DeleteActionPopover>
    </>
  );
}
