/* eslint-disable react/no-unescaped-entities */
import { Trans } from '@lingui/macro';
import { Grid, Group, NumberInput, TextInput } from '@mantine/core';
import {
  FileMetadataFields,
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { filesize } from 'filesize';
import { useState } from 'react';
import submissionApi from '../../../../../api/submission.api';
import { BasicWebsiteSelect } from '../../../../form/website-select/basic-website-select';

type FileMetadataManagerProps = {
  file: ISubmissionFileDto;
  metadata: FileSubmissionMetadata;
};

type FileDetailProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  file: ISubmissionFileDto;
  // eslint-disable-next-line react/no-unused-prop-types
  metadata: FileMetadataFields;
  // eslint-disable-next-line react/no-unused-prop-types
  save: () => void;
};

function FileDetails(props: FileDetailProps) {
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

function updateFileDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  height: number,
  width: number
) {
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions!.default = {
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

function FileDimensions(props: FileDetailProps) {
  const { file, metadata, save } = props;

  const { width: providedWidth, height: providedHeight } =
    metadata.dimensions.default ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);

  return (
    <Grid>
      <Grid.Col span={6}>
        <NumberInput
          label={<Trans>Height</Trans>}
          defaultValue={height}
          max={file.height}
          min={1}
          size="xs"
          onBlur={(event) => {
            const { width: aspectW, height: aspectH } = calculateAspectRatio(
              Math.min(Number(event.target.value), file.height),
              width,
              file.width / file.height,
              'h'
            );
            setHeight(aspectH);
            setWidth(aspectW);
            updateFileDimensions(metadata, file, aspectH, aspectW);
            save();
          }}
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <NumberInput
          label={<Trans>Width</Trans>}
          defaultValue={width}
          max={file.width}
          min={1}
          size="xs"
          onBlur={(event) => {
            const { width: aspectW, height: aspectH } = calculateAspectRatio(
              height,
              Math.min(Number(event.target.value), file.width),
              file.height / file.width,
              'w'
            );
            setHeight(aspectH);
            setWidth(aspectW);
            updateFileDimensions(metadata, file, aspectH, aspectW);
            save();
          }}
        />
      </Grid.Col>
    </Grid>
  );
}

function FileMetadata(props: FileDetailProps) {
  const { metadata, save } = props;

  return (
    <Grid>
      <Grid.Col span={12}>
        <BasicWebsiteSelect
          label={<Trans>Don't post to</Trans>}
          size="xs"
          selected={metadata.ignoredWebsites ?? []}
          onSelect={(accounts) => {
            metadata.ignoredWebsites = accounts.map((account) => account.id);
            save();
          }}
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <TextInput
          label={<Trans>Alt Text</Trans>}
          defaultValue={metadata.altText}
          size="xs"
          onBlur={(event) => {
            metadata.altText = event.target.value.trim();
            save();
          }}
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <TextInput
          label={<Trans>Spoiler Text</Trans>}
          defaultValue={metadata.spoilerText}
          size="xs"
          onBlur={(event) => {
            metadata.spoilerText = event.target.value.trim();
            save();
          }}
        />
      </Grid.Col>
    </Grid>
  );
}

export function FileMetadataManager(props: FileMetadataManagerProps) {
  const { file, metadata } = props;
  const fileType = getFileType(file.fileName);
  const meta = metadata.fileMetadata[file.id];
  const save = () => {
    submissionApi.update(file.id, { metadata });
  };
  const detailProps: FileDetailProps = { file, metadata: meta, save };
  return (
    <>
      <FileDetails {...detailProps} />
      <FileMetadata {...detailProps} />
      {fileType === FileType.IMAGE ? <FileDimensions {...detailProps} /> : null}
    </>
  );
}
