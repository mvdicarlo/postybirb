import { Alert } from '@mantine/core';
import { ISubmissionFileDto, ValidationResult } from '@postybirb/types';
import { IconAlertCircle } from '@tabler/icons-react';
import { useWebsites } from '../../../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

type FileValidationsProps = {
  submission: SubmissionDto;
  file: ISubmissionFileDto;
};

export function FileValidations(props: FileValidationsProps) {
  const { accounts } = useWebsites();
  const { submission, file } = props;
  const { validations } = submission;
  const fileValidations = [];
  validations.forEach((validation) => {
    const filteredResult: Required<ValidationResult> = {
      id: validation.id,
      errors:
        validation.errors
          ?.filter((error) => error.field === 'files')
          .filter((v) => 'fileId' in v.values && v.values.fileId === file.id) ??
        [],
      warnings:
        validation.warnings
          ?.filter((warning) => warning.field === 'files')
          .filter((v) => 'fileId' in v.values && v.values.fileId === file.id) ??
        [],
    };

    if (filteredResult.errors.length || filteredResult.warnings.length) {
      fileValidations.push(filteredResult);
    }
  });

  // TODO - display list
  // TODO - see that validations actually show up when they aren't parented to any particular field.
  return fileValidations.length ? (
    <Alert variant="outline" color="orange" icon={<IconAlertCircle />}>
      Hi
    </Alert>
  ) : null;
}
