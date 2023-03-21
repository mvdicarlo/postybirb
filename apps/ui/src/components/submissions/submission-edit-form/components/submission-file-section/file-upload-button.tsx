/* eslint-disable react/require-default-props */
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { useState } from 'react';
import ModalUploader from '../../../../shared/uploader/model-uploader';

type FileUploadButtonProps = {
  compress?: boolean;
  accept?: string[];
  label: string;
  endpointPath: string;
  onComplete: (submissionDto: ISubmissionDto) => void;
};

export default function FileUploadButton(props: FileUploadButtonProps) {
  const { compress, endpointPath, accept, label, onComplete } = props;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <span>
      <EuiToolTip position="top" content={label}>
        <EuiButtonIcon
          aria-label={label}
          iconType="exportAction"
          onClick={() => {
            setIsOpen(true);
          }}
        />
      </EuiToolTip>
      <ModalUploader
        compress={compress}
        accept={accept}
        endpointPath={endpointPath}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        onComplete={(submission) => {
          setIsOpen(false);
          onComplete(submission);
        }}
      />
    </span>
  );
}
