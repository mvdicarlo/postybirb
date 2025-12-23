/**
 * SubmissionTitle - Editable title component for submissions.
 */

import { Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

interface SubmissionTitleProps {
  /** Current title value */
  title: string | undefined;
  /** Fallback name if title is empty */
  name: string;
  /** Handler for title changes */
  onTitleChange?: (title: string) => void;
  /** If true, title is not editable */
  readOnly?: boolean;
}

/**
 * Editable title component that shows as text and becomes an input on click.
 */
export function SubmissionTitle({
  title,
  name,
  onTitleChange,
  readOnly = false,
}: SubmissionTitleProps) {
  const [localTitle, setLocalTitle] = useState(title ?? '');
  const [isEditing, setIsEditing] = useState(false);

  // Sync local title with prop
  useEffect(() => {
    setLocalTitle(title ?? '');
  }, [title]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setIsEditing(true);
  }, [readOnly]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmedTitle = localTitle.trim();
    if (trimmedTitle !== title) {
      onTitleChange?.(trimmedTitle);
    }
  }, [localTitle, title, onTitleChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setLocalTitle(title ?? '');
        setIsEditing(false);
      }
    },
    [title],
  );

  if (isEditing) {
    return (
      <TextInput
        size="xs"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.currentTarget.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        styles={{
          input: {
            fontWeight: 500,
            // eslint-disable-next-line lingui/no-unlocalized-strings
            padding: '2px 6px',
            // eslint-disable-next-line lingui/no-unlocalized-strings
            height: 'auto',
            // eslint-disable-next-line lingui/no-unlocalized-strings
            minHeight: 'unset',
          },
        }}
      />
    );
  }

  return (
    <Text
      size="sm"
      fw={500}
      lineClamp={1}
      onClick={handleClick}
      style={{ cursor: readOnly ? 'default' : 'text' }}
      title={title || name}
    >
      {title || name}
    </Text>
  );
}
