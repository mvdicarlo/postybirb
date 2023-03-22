/* eslint-disable @typescript-eslint/dot-notation */
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FileSubmissionMetadata, ISubmissionFile } from '@postybirb/types';
import { isImage } from '@postybirb/utils/file-type';
import { SubmissionDto } from 'apps/ui/src/models/dtos/submission.dto';
import { filesize } from 'filesize';
import { ReactNode, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionFormProps } from '../../submission-form-props';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-details.css';

type FileDetailsProps = SubmissionFormProps & {
  file: ISubmissionFile;
};

function SharedDetails(props: FileDetailsProps) {
  const { file } = props;
  const listItems: Array<{
    title: NonNullable<ReactNode>;
    description: NonNullable<ReactNode>;
  }> = [
    {
      title: (
        <FormattedMessage id="submission.file-name" defaultMessage="Name" />
      ),
      description: file.fileName,
    },
    {
      title: (
        <FormattedMessage id="submission.file-size" defaultMessage="Size" />
      ),
      description: <span>{filesize(file.size, { base: 2 }) as string}</span>,
    },
  ];

  return <EuiDescriptionList compressed listItems={listItems} type="column" />;
}

function storeFileDimensionModifications(
  submission: SubmissionDto<FileSubmissionMetadata>,
  file: ISubmissionFile,
  height: number,
  width: number
) {
  const { metadata } = submission;

  // Ensure structure
  metadata.modifiedFileDimensions = metadata.modifiedFileDimensions ?? {};
  metadata.modifiedFileDimensions['default'] =
    metadata.modifiedFileDimensions['default'] ?? {};
  metadata.modifiedFileDimensions['default'][file.id] =
    metadata.modifiedFileDimensions['default'][file.id] ?? {};

  // insert
  metadata.modifiedFileDimensions['default'][file.id] = {
    fileId: file.id,
    height,
    width,
  };
}

function calculateAspectRatio(
  height: number,
  width: number,
  aspect: number,
  order: 'h' | 'w'
) {
  if (order === 'h') {
    const aspectRatio = aspect; // width / height

    const widthT = Math.ceil(height * aspectRatio);
    const heightT = Math.ceil(height);

    return { width: widthT, height: heightT };
  }

  const aspectRatio = aspect; // height / width

  const heightT = Math.ceil(width * aspectRatio);
  const widthT = Math.ceil(width);

  return { width: widthT, height: heightT };
}

function ImageDetails(props: FileDetailsProps) {
  const { file, submission, onUpdate } = props;
  const { width: providedWidth, height: providedHeight } =
    (submission as SubmissionDto<FileSubmissionMetadata>).metadata
      ?.modifiedFileDimensions?.['default']?.[file.id] ?? file;
  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label={<FormattedMessage id="height" defaultMessage="Height" />}
        >
          <EuiFieldNumber
            value={height}
            compressed
            max={file.height}
            min={1}
            onChange={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                Number(event.target.value),
                width,
                file.width / file.height,
                'h'
              );
              setHeight(aspectH);
              setWidth(aspectW);
              storeFileDimensionModifications(
                submission as SubmissionDto<FileSubmissionMetadata>,
                file,
                aspectH,
                aspectW
              );
              onUpdate();
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          label={<FormattedMessage id="width" defaultMessage="Width" />}
        >
          <EuiFieldNumber
            value={width}
            compressed
            max={file.width}
            min={1}
            onChange={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                height,
                Number(event.target.value),
                file.height / file.width,
                'w'
              );
              setHeight(aspectH);
              setWidth(aspectW);
              storeFileDimensionModifications(
                submission as SubmissionDto<FileSubmissionMetadata>,
                file,
                aspectH,
                aspectW
              );
              onUpdate();
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function removeFile(submissionId: string, file: ISubmissionFile) {
  return SubmissionsApi.removeFile(submissionId, file.id);
}

export function FileDetails(props: FileDetailsProps) {
  const { submission, file, onUpdate } = props;

  const imageInfo = useMemo(() => {
    if (isImage(file.fileName)) {
      return (
        <div>
          <EuiSpacer size="xs" />
          <ImageDetails {...props} />
          <div className="text-center">
            {submission.files.length > 1 ? (
              <EuiButtonIcon
                size="s"
                className="mt-2"
                iconType="trash"
                aria-label={`Remove ${file.fileName}`}
                color="danger"
                onClick={() => {
                  removeFile(submission.id, file).then((update) => {
                    mergeSubmission(submission, update.body, [
                      'files',
                      'metadata',
                    ]);
                    onUpdate();
                  });
                }}
              />
            ) : null}
          </div>
        </div>
      );
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="postybirb__file-details">
      <SharedDetails {...props} />
      {imageInfo}
    </div>
  );
}
