/**
 * SubmissionThumbnail - Thumbnail component with optional HoverCard preview.
 * Uses IntersectionObserver to only load images when the card is near the viewport,
 * reducing memory usage when displaying hundreds of submissions.
 */

import { Box, HoverCard, Image, Indicator } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import '../submissions-section.css';
import { useVisibility } from './use-visibility';

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
 * Uses IntersectionObserver to defer image loading until card is near viewport.
 */
export function SubmissionThumbnail({
  thumbnailUrl,
  alt,
  canPreview = false,
  fileCount = 1,
}: SubmissionThumbnailProps) {
  // Use custom visibility hook for stable intersection detection
  // Starts visible, then tracks when element scrolls in/out of view
  const { ref, isVisible } = useVisibility<HTMLDivElement>({
    rootMargin: '300px',
  });

  // Calculate additional files (total - 1 for the primary file shown)
  const additionalFiles = fileCount > 1 ? fileCount - 1 : 0;

  // Only render the actual image when visible, otherwise show placeholder
  const shouldShowImage = isVisible && thumbnailUrl;

  const thumbnailBox = (
    <Indicator
      label={`+${additionalFiles}`}
      size={16}
      position="bottom-end"
      offset={4}
      disabled={additionalFiles === 0}
    >
      <Box ref={ref} className="postybirb__submission__thumbnail">
        {shouldShowImage ? (
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

  // Wrap in HoverCard only if visible, can preview, and has thumbnail URL
  // No point adding HoverCard DOM overhead for off-screen items
  if (isVisible && canPreview && thumbnailUrl) {
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
}
