import {
  EuiButtonEmpty,
  EuiHeaderSectionItemButton,
  EuiIcon,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import websiteOptionsApi from '../../../../../api/website-options.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { HttpResponse } from '../../../../../transports/http-client';
import DeleteActionPopover from '../../../../shared/delete-action-popover/delete-action-popover';
import {
  SquareFilledIcon,
  SquareIcon,
  SquareMinusIcon,
} from '../../../../shared/icons/Icons';
import TemplatePickerModal from '../../../../submission-templates/template-picker-modal/template-picker-modal';

type SubmissionTableActionsProps = {
  selected: SubmissionDto[];
  submissions: SubmissionDto[];
  onSelectAll: () => void;
  onUnselectAll: () => void;
  onDeleteSelected: (selected: SubmissionDto[]) => void;
};

function ApplyTemplateAction(
  props: Pick<SubmissionTableActionsProps, 'selected'>
) {
  const { selected } = props;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const type = selected[0]?.type ?? SubmissionType.FILE;
  return (
    <EuiButtonEmpty
      iconType="article"
      disabled={selected.length === 0}
      color="primary"
      size="s"
      onClick={() => setIsModalVisible(true)}
    >
      <Trans>Apply Template</Trans>

      {isModalVisible ? (
        <TemplatePickerModal
          submissionId={selected.length === 1 ? selected[0].id : undefined}
          type={type}
          onApply={(options) => {
            setIsModalVisible(false);
            selected.forEach((submission) => {
              options.forEach((option) => {
                websiteOptionsApi.create({
                  submission: submission.id,
                  account: option.account,
                  data: option.data,
                });
              });
            });
          }}
          onClose={() => {
            setIsModalVisible(false);
          }}
        />
      ) : null}
    </EuiButtonEmpty>
  );
}

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
      <ApplyTemplateAction selected={selected} />
    </>
  );
}
