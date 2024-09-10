import { Trans } from '@lingui/macro';
import { Group } from '@mantine/core';
import { FileSubmissionMetadata, ISubmissionFileDto } from '@postybirb/types';
import { filesize } from 'filesize';

type SubmissionFileMetadataManagerProps = {
  file: ISubmissionFileDto;
  metadata: FileSubmissionMetadata;
};

function FileDetails(props: SubmissionFileMetadataManagerProps) {
  const { file } = props;
  return (
    <Group>
      <Group gap="sm">
        <strong>
          <Trans>Name</Trans>
        </strong>
        <span>{file.fileName}</span>
      </Group>

      <Group gap="sm">
        <strong>
          <Trans context="submission.file-size">Size</Trans>
        </strong>
        <span>{filesize(file.size, { base: 2 }) as string}</span>
      </Group>
    </Group>
  );
}

// TODO: Implement metadata editing
function FileMetadata(props: SubmissionFileMetadataManagerProps) {
  const { metadata } = props;
  return <>Metadata</>;
}

export function SubmissionFileMetadataManager(
  props: SubmissionFileMetadataManagerProps
) {
  return (
    <>
      <FileDetails {...props} />
      <FileMetadata {...props} />
    </>
  );
}
