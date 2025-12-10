/**
 * FileSubmissionThumbnail - Thumbnail component with optional HoverCard preview.
 */

import { Box, HoverCard, Image } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import '../file-submissions-section.css';

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
    <Box className="postybirb__file_submission__thumbnail">
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt={alt} w={40} h={40} fit="cover" />
      ) : (
        <IconFile
          size={20}
          stroke={1.5}
          className="postybirb__file_submission__thumbnail_placeholder"
        />
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
