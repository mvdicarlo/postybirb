import fileSubmissionApi from '../../../../../api/file-submission.api';
import { DeleteActionPopover } from '../../../../shared/delete-action-popover/delete-action-popover';

type FileCardDeleteActionProps = {
  submissionId: string;
  file: { id: string };
  totalFiles: number;
};

export function FileCardDeleteAction({
  submissionId,
  file,
  totalFiles,
}: FileCardDeleteActionProps) {
  return (
    <DeleteActionPopover
      disabled={totalFiles === 1}
      onDelete={() => {
        fileSubmissionApi.removeFile(submissionId, file.id, 'file');
      }}
    />
  );
}
