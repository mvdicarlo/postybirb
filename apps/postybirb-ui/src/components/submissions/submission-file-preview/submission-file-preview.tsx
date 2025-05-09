import { Box, Image, ThemeIcon, Tooltip } from '@mantine/core';
import { FileType, ISubmissionFileDto } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconDeviceAudioTape,
  IconFile,
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

  const iconStyle = {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  };

  if (type === FileType.VIDEO) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="blue" style={iconStyle}>
          <IconVideo size={Math.min(Number(width), Number(height)) * 0.5} />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.AUDIO) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="grape" style={iconStyle}>
          <IconDeviceAudioTape
            size={Math.min(Number(width), Number(height)) * 0.5}
          />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.TEXT) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="teal" style={iconStyle}>
          <IconTextCaption
            size={Math.min(Number(width), Number(height)) * 0.5}
          />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.IMAGE) {
    const src = `${defaultTargetProvider()}/api/file/thumbnail/${file.id}`;
    return (
      <Tooltip label={file.fileName}>
        <Box
          style={{
            width,
            height,
            overflow: 'hidden',
            borderRadius: '4px',
            // eslint-disable-next-line lingui/no-unlocalized-strings
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1) inset',
          }}
        >
          <Image
            src={src}
            alt={file.fileName}
            height={height}
            width={width}
            fit="cover"
            loading="lazy"
            style={{ objectPosition: 'center' }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={file.fileName}>
      <ThemeIcon variant="light" color="gray" style={iconStyle}>
        <IconFile size={Math.min(Number(width), Number(height)) * 0.5} />
      </ThemeIcon>
    </Tooltip>
  );
}
