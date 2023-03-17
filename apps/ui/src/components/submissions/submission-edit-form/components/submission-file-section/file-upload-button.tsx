import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ISubmissionFile } from '@postybirb/types';
import { useRef } from 'react';
import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';

type FileUploadButtonProps = {
  submission: SubmissionDto;
  submissionFile: ISubmissionFile;
  accept: string;
  label: string;
  onUpdate: () => void;
};

export default function FileUploadButton(props: FileUploadButtonProps) {
  const { submission, submissionFile, accept, label, onUpdate } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(event) => {
          if (event.target.files?.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const file = event.target.files.item(0)!;
            SubmissionsApi.changeFile(
              submission.id,
              submissionFile.id,
              file
            ).then((update) => {
              mergeSubmission(submission, update.body, ['files', 'metadata']);
              onUpdate();
            });
          }
        }}
      />
      <EuiToolTip position="top" content={label}>
        <EuiButtonIcon
          aria-label={label}
          iconType="exportAction"
          onClick={() => {
            inputRef.current?.click();
          }}
        />
      </EuiToolTip>
    </span>
  );
}
