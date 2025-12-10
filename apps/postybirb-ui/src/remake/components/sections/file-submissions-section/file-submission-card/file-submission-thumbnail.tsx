/**
 * FileSubmissionThumbnail - Thumbnail component with optional HoverCard preview.
 */

import { Box, HoverCard, Image } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';

interface FileSubmissionThumbnailProps {
  /** URL of the thumbnail image */
  thumbnailUrl: string | undefined;
  /** Alt text for the image */
  alt: string;
  /** Whether the image can be previewed in a HoverCard */
  canPreview?: boolean;
}

/**
 * Thumbnail component for file submissions.
 * Shows the thumbnail image or a placeholder icon.
 * Optionally wraps in a HoverCard for image preview on hover.
 */
export function FileSubmissionThumbnail({
  thumbnailUrl,
  alt,
  canPreview = false,
}: FileSubmissionThumbnailProps) {
  const thumbnailBox = (
    <Box
      w={40}
      h={40}
      style={{
        flexShrink: 0,
        borderRadius: 'var(--mantine-radius-sm)',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt={alt} w={40} h={40} fit="cover" />
      ) : (
        <IconFile size={20} stroke={1.5} opacity={0.5} />
      )}
    </Box>
  );

  // Wrap in HoverCard if image can be previewed
  if (canPreview && thumbnailUrl) {
    return (
      <HoverCard width={280} position="right" openDelay={400} shadow="md">
        <HoverCard.Target>{thumbnailBox}</HoverCard.Target>
        <HoverCard.Dropdown p="xs">
          <Image src={thumbnailUrl} alt={alt} fit="contain" radius="sm" />
        </HoverCard.Dropdown>
      </HoverCard>
    );
  }

  return thumbnailBox;
}
