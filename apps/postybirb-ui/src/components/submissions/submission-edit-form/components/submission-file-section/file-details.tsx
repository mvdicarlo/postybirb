/* eslint-disable @typescript-eslint/dot-notation */
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { FileSubmissionMetadata, ISubmissionFileDto } from '@postybirb/types';
import { isImage } from '@postybirb/utils/file-type';
import { filesize } from 'filesize';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { useSubmission } from '../../../../../hooks/submission/use-submission';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { SimpleWebsiteSelect } from '../submission-form-website-select/simple-website-select';
import { mergeSubmission } from '../utilities/submission-edit-form-utilities';
import './file-details.css';

function updateFileDimensions(
  submission: SubmissionDto<FileSubmissionMetadata>,
  file: ISubmissionFileDto,
  height: number,
  width: number
) {
  const { metadata } = submission;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  metadata.fileMetadata[file.id].dimensions!['default'] = {
    fileId: file.id,
    height,
    width,
  };
}

function updateAltInfo(
  submission: SubmissionDto<FileSubmissionMetadata>,
  file: ISubmissionFileDto,
  altText: string
) {
  const { metadata } = submission;
  metadata.fileMetadata[file.id].altText = altText;
}

function updateIgnoredWebsites(
  submission: SubmissionDto<FileSubmissionMetadata>,
  file: ISubmissionFileDto,
  ignoredWebsites: string[]
) {
  const { metadata } = submission;
  metadata.fileMetadata[file.id].ignoredWebsites = ignoredWebsites ?? [];
}

type FileDetailsProps = {
  file: ISubmissionFileDto;
};

function SharedDetails(props: FileDetailsProps) {
  const { submission, updateView } = useSubmission();
  const { file } = props;
  const fileMetadata = (submission as SubmissionDto<FileSubmissionMetadata>)
    .metadata.fileMetadata[file.id];

  const providedAltText = fileMetadata.altText || '';
  const providedIgnoredWebsites = fileMetadata.ignoredWebsites ?? [];

  const [altText, setAltText] = useState<string>(providedAltText);
  const [ignoredWebsites, setIgnoredWebsites] = useState<string[]>(
    providedIgnoredWebsites
  );

  const updateAltText = useCallback(
    (text: string) => {
      updateAltInfo(
        submission as SubmissionDto<FileSubmissionMetadata>,
        file,
        text
      );
      setAltText(text);
      updateView();
    },
    [file, updateView, submission]
  );

  const listItems: Array<{
    title: NonNullable<ReactNode>;
    description: NonNullable<ReactNode>;
  }> = [
    {
      title: <Trans>Name</Trans>,
      description: file.fileName,
    },
    {
      title: <Trans context="submission.file-size">Size</Trans>,
      description: <span>{filesize(file.size, { base: 2 }) as string}</span>,
    },
  ];

  return (
    <>
      <EuiDescriptionList compressed listItems={listItems} type="column" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={<Trans context="alt-text">Alt Text</Trans>}
          >
            <EuiFieldText
              compressed
              fullWidth
              value={altText}
              onChange={(event) => {
                updateAltText(event.target.value);
              }}
              onBlur={(event) => {
                updateAltText(event.target.value.trim());
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            // eslint-disable-next-line react/no-unescaped-entities
            label={<Trans>Don't post to</Trans>}
          >
            <SimpleWebsiteSelect
              selected={ignoredWebsites}
              submission={submission}
              onChange={(websites) => {
                updateIgnoredWebsites(
                  submission as SubmissionDto<FileSubmissionMetadata>,
                  file,
                  websites
                );
                setIgnoredWebsites(websites);
                updateView();
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
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
  const { submission, updateView } = useSubmission();
  const { file } = props;
  const fileMetadata = (submission as SubmissionDto<FileSubmissionMetadata>)
    .metadata.fileMetadata[file.id];

  const { width: providedWidth, height: providedHeight } =
    fileMetadata.dimensions['default'] ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow label={<Trans>Height</Trans>}>
          <EuiFieldNumber
            value={height}
            compressed
            max={file.height}
            min={1}
            onChange={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                Math.min(Number(event.target.value), file.height),
                width,
                file.width / file.height,
                'h'
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(
                submission as SubmissionDto<FileSubmissionMetadata>,
                file,
                aspectH,
                aspectW
              );
              updateView();
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label={<Trans>Width</Trans>}>
          <EuiFieldNumber
            value={width}
            compressed
            max={file.width}
            min={1}
            onChange={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                height,
                Math.min(Number(event.target.value), file.width),
                file.height / file.width,
                'w'
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(
                submission as SubmissionDto<FileSubmissionMetadata>,
                file,
                aspectH,
                aspectW
              );
              updateView();
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function removeFile(submissionId: string, file: ISubmissionFileDto) {
  return fileSubmissionApi.removeFile(submissionId, file.id, 'file');
}

export function FileDetails(props: FileDetailsProps) {
  const { submission, updateView } = useSubmission();
  const { file } = props;
  const { _ } = useLingui();

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
                aria-label={_(msg`Remove ${file.fileName}`)}
                color="danger"
                onClick={() => {
                  removeFile(submission.id, file).then((update) => {
                    mergeSubmission(submission, update.body, [
                      'files',
                      'metadata',
                    ]);
                    updateView();
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
