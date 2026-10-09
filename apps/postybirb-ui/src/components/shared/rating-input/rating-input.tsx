/**
 * RatingInput - Submission rating selector using icon-based rating component.
 * Provides a 4-level rating system: General, Mature, Adult, Extreme.
 */

import { useLingui } from '@lingui/react/macro';
import { Group, Rating, Tooltip } from '@mantine/core';
import { SubmissionRating } from '@postybirb/types';
import {
  IconCircleLetterE,
  IconCircleLetterM,
  IconExclamationCircle,
  IconRating18Plus,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';

export interface RatingInputProps {
  /** Current rating value */
  value: SubmissionRating;
  /** Callback when rating changes */
  onChange: (rating: SubmissionRating) => void;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Whether to show tooltip */
  showTooltip?: boolean;
}

// Map rating enum to numeric value (1-4)
const ratingToValue: Record<SubmissionRating, number> = {
  [SubmissionRating.GENERAL]: 1,
  [SubmissionRating.MATURE]: 2,
  [SubmissionRating.ADULT]: 3,
  [SubmissionRating.EXTREME]: 4,
};

// Map numeric value to rating enum
const valueToRating: Record<number, SubmissionRating> = {
  1: SubmissionRating.GENERAL,
  2: SubmissionRating.MATURE,
  3: SubmissionRating.ADULT,
  4: SubmissionRating.EXTREME,
};

// Size to icon dimensions mapping
const sizeToIconDimensions: Record<'xs' | 'sm' | 'md', number> = {
  xs: 16,
  sm: 18,
  md: 22,
};

const getIconStyle = (size: 'xs' | 'sm' | 'md', color?: string) => ({
  width: sizeToIconDimensions[size],
  height: sizeToIconDimensions[size],
  color: color ? `var(--mantine-color-${color}-7)` : undefined,
});

function getEmptyIcon(size: 'xs' | 'sm' | 'md', value: number) {
  const iconStyle = getIconStyle(size);

  switch (value) {
    case 1:
      return <IconCircleLetterE style={iconStyle} />;
    case 2:
      return <IconCircleLetterM style={iconStyle} />;
    case 3:
      return <IconRating18Plus style={iconStyle} />;
    case 4:
      return <IconExclamationCircle style={iconStyle} />;
    default:
      return null;
  }
}

function getFullIcon(size: 'xs' | 'sm' | 'md', value: number) {
  switch (value) {
    case 1:
      return <IconCircleLetterE style={getIconStyle(size, 'green')} />;
    case 2:
      return <IconCircleLetterM style={getIconStyle(size, 'yellow')} />;
    case 3:
      return <IconRating18Plus style={getIconStyle(size, 'orange')} />;
    case 4:
      return <IconExclamationCircle style={getIconStyle(size, 'red')} />;
    default:
      return null;
  }
}

/**
 * Rating input component using Mantine Rating with custom icons.
 * Displays 4 icons representing General, Mature, Adult, Extreme ratings.
 * Only the selected rating icon is colored.
 */
export function RatingInput({
  value,
  onChange,
  size = 'sm',
  showTooltip = true,
}: RatingInputProps) {
  const { t } = useLingui();
  const numericValue = ratingToValue[value] ?? 1;
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  // Rating labels for tooltips
  const ratingLabels: Record<number, string> = {
    1: t`General`,
    2: t`Mature`,
    3: t`Adult`,
    4: t`Extreme`,
  };

  // Show tooltip for hovered value, or current value if not hovering
  const displayValue = hoveredValue ?? numericValue;
  const ratingLabel = ratingLabels[displayValue];

  const handleChange = useCallback(
    (newValue: number) => {
      // Rating component can return 0 if clicked on same value, keep at least 1
      const safeValue = Math.max(1, newValue);
      const newRating = valueToRating[safeValue];
      if (newRating && newRating !== value) {
        onChange(newRating);
      }
    },
    [value, onChange],
  );

  // Create icon function that only colors the selected value
  const getSymbol = useCallback(
    (val: number) => {
      // Only show the colored icon for the exact selected value
      if (val === numericValue) {
        return getFullIcon(size, val);
      }
      return getEmptyIcon(size, val);
    },
    [size, numericValue],
  );

  const ratingComponent = (
    <Rating
      value={numericValue}
      count={4}
      onChange={handleChange}
      onHover={setHoveredValue}
      emptySymbol={getSymbol}
      fullSymbol={getSymbol}
      highlightSelectedOnly
    />
  );

  if (!showTooltip) {
    return <Group gap="xs">{ratingComponent}</Group>;
  }

  return (
    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={ratingLabel} position="top">
        {ratingComponent}
      </Tooltip>
    </Group>
  );
}
