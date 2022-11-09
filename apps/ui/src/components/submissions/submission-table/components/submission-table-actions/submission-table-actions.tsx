import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { useKeybinding } from 'apps/ui/src/components/app/keybinding/keybinding';
import {
  ActionEntityType,
  ActionHistory,
} from 'apps/ui/src/modules/action-history/action-history';
import {
  RedoKeybinding,
  UndoKeybinding,
} from 'apps/ui/src/shared/app-keybindings';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import {
  SquareFilledIcon,
  SquareIcon,
  SquareMinusIcon,
} from '../../../../../shared/icons/Icons';

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

  const hasUndoAction = ActionHistory.hasUndoActions(
    ActionEntityType.SUBMISSION
  );
  const hasRedoAction = ActionHistory.hasRedoActions(
    ActionEntityType.SUBMISSION
  );

  useKeybinding({
    keybinding: UndoKeybinding,
    onActivate(event) {
      if (
        !(event.target instanceof HTMLInputElement) &&
        !document.querySelector('.euiModal') &&
        !document.querySelector('.euiFlyoutHeader')
      ) {
        ActionHistory.Undo(ActionEntityType.SUBMISSION);
      }
    },
  });

  useKeybinding({
    keybinding: RedoKeybinding,
    onActivate(event) {
      if (
        !(event.target instanceof HTMLInputElement) &&
        !document.querySelector('.euiModal') &&
        !document.querySelector('.euiFlyoutHeader')
      ) {
        ActionHistory.Redo(ActionEntityType.SUBMISSION);
      }
    },
  });

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
        disabled={!hasUndoAction}
        onClick={() => ActionHistory.Undo(ActionEntityType.SUBMISSION)}
      >
        <EuiIcon type="editorUndo" />
      </EuiHeaderSectionItemButton>
      <EuiHeaderSectionItemButton
        disabled={!hasRedoAction}
        onClick={() => ActionHistory.Redo(ActionEntityType.SUBMISSION)}
      >
        <EuiIcon type="editorRedo" />
      </EuiHeaderSectionItemButton>
      <EuiHeaderSectionItemButton
        color="danger"
        notification={selected.length}
        disabled={selected.length === 0}
        onClick={() => onDeleteSelected(selected)}
      >
        <EuiIcon type="trash" />
      </EuiHeaderSectionItemButton>
    </>
  );
}
