import { EuiButtonIcon } from '@elastic/eui';
import { ISubmissionFile } from '@postybirb/types';
import SubmissionsApi from 'apps/ui/src/api/submission.api';
import { SubmissionDto } from 'apps/ui/src/models/dtos/submission.dto';
import { useRef } from 'react';

type FileUploadButtonProps = {
  submission: SubmissionDto;
  submissionFile: ISubmissionFile;
  accept: string;
  label: string;
};

export default function FileUploadButton(props: FileUploadButtonProps) {
  const { submission, submissionFile, accept, label } = props;
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
            SubmissionsApi.changeFile(submission.id, submissionFile.id, file);
          }
        }}
      />
      <EuiButtonIcon
        aria-label={label}
        iconType="exportAction"
        onClick={() => {
          inputRef.current?.click();
        }}
      />
    </span>
  );
}
