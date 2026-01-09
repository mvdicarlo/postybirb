/**
 * FilePreview - File preview card with thumbnail and title editing.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Card,
    Flex,
    Group,
    Image,
    Text,
    TextInput,
    ThemeIcon,
    Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { FileType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconDeviceAudioTape,
    IconPencil,
    IconPhoto,
    IconPhotoEdit,
    IconTextCaption,
    IconTrash,
    IconVideo,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './file-submission-modal.css';
import { FileItem, generateThumbnail } from './file-submission-modal.utils';

export interface FilePreviewProps {
  item: FileItem;
  onDelete: (file: FileWithPath) => void;
  onEdit?: (file: FileWithPath) => void;
  onTitleChange: (file: FileWithPath, title: string) => void;
}

/**
 * File preview card with optional title editing.
 * Generates a small thumbnail on mount to reduce memory usage.
 */
export function FilePreview({
  item,
  onDelete,
  onEdit,
  onTitleChange,
}: FilePreviewProps) {
  const { file, title } = item;
  const type = getFileType(file.name);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Generate thumbnail on mount
  useEffect(() => {
    if (type !== FileType.IMAGE) {
      return undefined;
    }

    let cancelled = false;
    let url: string | null = null;

    generateThumbnail(file, 100)
      .then((generatedUrl: string) => {
        if (!cancelled) {
          url = generatedUrl;
          setImageUrl(generatedUrl);
        } else {
          URL.revokeObjectURL(generatedUrl);
        }
      })
      .catch(() => {
        // Silently fail - will show placeholder icon
      });

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [type, file]);

  const getTypeInfo = useCallback(() => {
    switch (type) {
      case FileType.VIDEO:
        return { icon: <IconVideo size={20} />, color: 'violet' };
      case FileType.AUDIO:
        return { icon: <IconDeviceAudioTape size={20} />, color: 'orange' };
      case FileType.TEXT:
        return { icon: <IconTextCaption size={20} />, color: 'teal' };
      case FileType.IMAGE:
      default:
        return { icon: <IconPhoto size={20} />, color: 'blue' };
    }
  }, [type]);

  const { icon, color } = getTypeInfo();

  // Create 50px thumbnail preview
  const preview = useMemo(() => {
    if (type === FileType.IMAGE && imageUrl) {
      return (
        <Image
          src={imageUrl}
          alt={file.name}
          h={50}
          w={50}
          radius="sm"
          fit="cover"
          className="postybirb__file_preview_thumbnail"
        />
      );
    }
    return (
      <ThemeIcon size={50} radius="sm" variant="light" color={color}>
        {icon}
      </ThemeIcon>
    );
  }, [type, imageUrl, file.name, color, icon]);

  const handleTitleSave = useCallback(() => {
    onTitleChange(file, editedTitle);
    setIsEditingTitle(false);
  }, [file, editedTitle, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSave();
      } else if (e.key === 'Escape') {
        setEditedTitle(title);
        setIsEditingTitle(false);
      }
    },
    [handleTitleSave, title],
  );

  return (
    <Card withBorder p="xs" radius="sm" className="postybirb__file_preview">
      <Flex align="center" gap="sm">
        {preview}
        <div className="postybirb__file_preview_content">
          {isEditingTitle ? (
            <TextInput
              size="xs"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <Text size="sm" lineClamp={1} fw={500}>
              {title}
            </Text>
          )}
          <Text size="xs" c="dimmed" lineClamp={1}>
            {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
            {(file.size / 1024 / 1024).toFixed(2)} MB • {type}
          </Text>
        </div>
        <Group gap={4} wrap="nowrap">
          <Tooltip label={<Trans>Edit title</Trans>} withArrow position="top">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setIsEditingTitle(true)}
            >
              <IconPencil size={14} />
            </ActionIcon>
          </Tooltip>
          {type === FileType.IMAGE && !file.type.includes('gif') && onEdit && (
            <Tooltip label={<Trans>Edit image</Trans>} withArrow position="top">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={() => onEdit(file)}
              >
                <IconPhotoEdit size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={<Trans>Delete</Trans>} withArrow position="top">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => onDelete(file)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>
    </Card>
  );
}
