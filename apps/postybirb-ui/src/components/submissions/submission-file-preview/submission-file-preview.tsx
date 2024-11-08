import { Image, Tooltip } from '@mantine/core';
import { FileType, ISubmissionFileDto } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconDeviceAudioTape,
    IconTextCaption,
    IconVideo,
} from '@tabler/icons-react';
import { defaultTargetProvider } from '../../../transports/http-client';

type SubmissionFilePreviewProps = {
  file: ISubmissionFileDto;
  height: string | number;
  width: string | number;
};

export function SubmissionFilePreview(props: SubmissionFilePreviewProps) {
  const { file, height, width } = props;
  const type = getFileType(file.fileName);
  if (type === FileType.VIDEO) {
    return (
      <Tooltip label={file.fileName}>
        <IconVideo width={width} height={height} />
      </Tooltip>
    );
  }

  if (type === FileType.AUDIO) {
    return (
      <Tooltip label={file.fileName}>
        <IconDeviceAudioTape width={width} height={height} />
      </Tooltip>
    );
  }

  if (type === FileType.TEXT) {
    return (
      <Tooltip label={file.fileName}>
        <IconTextCaption width={width} height={height} />
      </Tooltip>
    );
  }

  if (type === FileType.IMAGE) {
    const src = `${defaultTargetProvider()}/api/file/thumbnail/${file.id}`;
    return (
      <Tooltip label={file.fileName}>
        <Image
          src={src}
          alt={file.fileName}
          height={height}
          width={width}
          fit="contain"
          loading="lazy"
        />
      </Tooltip>
    );
  }

  return null;
}
