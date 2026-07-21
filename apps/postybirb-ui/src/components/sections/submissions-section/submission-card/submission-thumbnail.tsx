/**
 * SubmissionThumbnail - Thumbnail component with optional HoverCard preview.
 * Images load immediately since virtualization ensures only near-viewport cards are mounted.
 */

import { Box, HoverCard, Image, Indicator } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import { memo } from 'react';
import '../submissions-section.css';

interface SubmissionThumbnailProps {
  /** URL of the thumbnail image */
  thumbnailUrl: string | undefined;
  /** Alt text for the image */
  alt: string;
  /** Whether the image can be previewed in a HoverCard */
  canPreview?: boolean;
  /** Total number of files (shows indicator if > 1) */
  fileCount?: number;
}

/**
 * Thumbnail component for submissions.
 * Shows the thumbnail image or a placeholder icon.
 * Optionally wraps in a HoverCard for image preview on hover.
 */
export const SubmissionThumbnail = memo(({
  thumbnailUrl,
  alt,
  canPreview = false,
  fileCount = 1,
}: SubmissionThumbnailProps) => {
  const thumbnailBox = (
    <Indicator
      label={fileCount}
      size={16}
      position="top-end"
      offset={4}
      disabled={fileCount <= 1}
      color="blue"
    >
      <Box className="postybirb__submission__thumbnail">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={alt} w={40} h={40} fit="cover" />
        ) : (
          <IconFile
            size={20}
            stroke={1.5}
            className="postybirb__submission__thumbnail_placeholder"
          />
        )}
      </Box>
    </Indicator>
  );

  if (canPreview && thumbnailUrl) {
    return (
      <HoverCard width={280} position="right" openDelay={400} shadow="md">
        <HoverCard.Target>{thumbnailBox}</HoverCard.Target>
        <HoverCard.Dropdown p="xs">
          <Image
            loading="lazy"
            src={thumbnailUrl}
            alt={alt}
            fit="contain"
            radius="sm"
          />
        </HoverCard.Dropdown>
      </HoverCard>
    );
  }

  return thumbnailBox;
});
