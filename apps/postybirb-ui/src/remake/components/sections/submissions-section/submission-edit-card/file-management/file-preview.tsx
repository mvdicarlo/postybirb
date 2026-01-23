/**
 * FilePreview - Renders appropriate preview based on file type.
 */

import { Image } from '@mantine/core';
import { FileType, ISubmissionFileDto } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconFileText, IconFileUnknown } from '@tabler/icons-react';
import { defaultTargetProvider } from '../../../../../../transports/http-client';

interface FilePreviewProps {
  file: ISubmissionFileDto;
  size?: number;
}

export function FilePreview({ file, size = 80 }: FilePreviewProps) {
  const { fileName, id, hash } = file;
  const fileType = getFileType(fileName);
  const src = `${defaultTargetProvider()}/api/file/file/${id}?${hash}`;

  switch (fileType) {
    case FileType.AUDIO:
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls style={{ height: size, width: size }}>
          <source src={src} type="audio/ogg" />
          <source src={src} type="audio/mpeg" />
          <source src={src} type="audio/mp3" />
          <source src={src} type="audio/wav" />
          <source src={src} type="audio/webm" />
        </audio>
      );

    case FileType.TEXT:
      return (
        <IconFileText
          style={{ display: 'block' }}
          height={size}
          width={size * 0.6}
          color="var(--mantine-color-teal-5)"
        />
      );

    case FileType.VIDEO:
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          width={size * 1.5}
          height={size}
          controls
          style={{ borderRadius: 4 }}
        >
          <source src={src} type="video/mp4" />
          <source src={src} type="video/ogg" />
          <source src={src} type="video/webm" />
        </video>
      );

    case FileType.IMAGE:
      return (
        <Image
          radius={4}
          loading="lazy"
          h={size}
          w={size}
          fit="contain"
          alt={fileName}
          src={src}
        />
      );

    case FileType.UNKNOWN:
    default:
      return (
        <IconFileUnknown
          style={{ display: 'block' }}
          height={size}
          width={size * 0.6}
          color="var(--mantine-color-gray-5)"
        />
      );
  }
}

/**
 * ThumbnailPreview - Preview for thumbnail image.
 */
interface ThumbnailPreviewProps {
  file: ISubmissionFileDto;
  size?: number;
}

export function ThumbnailPreview({ file, size = 60 }: ThumbnailPreviewProps) {
  if (!file.hasThumbnail || !file.thumbnailId) {
    return null;
  }

  const src = `${defaultTargetProvider()}/api/file/file/${file.thumbnailId}?${file.hash}`;

  return (
    <Image
      radius={4}
      loading="lazy"
      h={size}
      w={size}
      fit="contain"
      // eslint-disable-next-line lingui/no-unlocalized-strings
      alt="Thumbnail"
      src={src}
    />
  );
}
