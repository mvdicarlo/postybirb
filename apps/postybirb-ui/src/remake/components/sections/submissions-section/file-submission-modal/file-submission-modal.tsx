/**
 * FileSubmissionModal - Modal for creating file submissions with enhanced options.
 *
 * Features:
 * - File dropzone with preview
 * - Per-file title editing
 * - Default tags, description, and rating
 * - Template selection
 * - Image editing support
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    Button,
    CloseButton,
    Flex,
    Group,
    Overlay,
    Paper,
    Portal,
    Progress,
    Text,
    Transition,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
    DefaultDescription,
    Description,
    IFileMetadata,
    SubmissionId,
    SubmissionRating,
    SubmissionType,
    Tag,
} from '@postybirb/types';
import {
    IconCheck,
    IconExclamationCircle,
    IconFileUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { FileDropzone } from './file-dropzone';
import { FileList } from './file-list';
import './file-submission-modal.css';
import { FileItem, getDefaultTitle } from './file-submission-modal.utils';
import { SubmissionOptions } from './submission-options';

export interface FileSubmissionModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when files are uploaded */
  onUpload: (params: {
    files: File[];
    fileMetadata: IFileMetadata[];
    defaultOptions: {
      tags?: Tag[];
      description?: Description;
      rating?: SubmissionRating;
    };
    templateId?: SubmissionId;
  }) => Promise<void>;
  /** Submission type (FILE or MESSAGE) */
  type?: SubmissionType;
}

/**
 * FileSubmissionModal - Enhanced file upload modal.
 */
export function FileSubmissionModal({
  opened,
  onClose,
  onUpload,
  type = SubmissionType.FILE,
}: FileSubmissionModalProps) {
  // File state
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  // Default options state
  const [tags, setTags] = useState<Tag[]>([]);
  const [description, setDescription] =
    useState<Description>(DefaultDescription());
  const [rating, setRating] = useState<SubmissionRating>(
    SubmissionRating.GENERAL,
  );

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    SubmissionId | undefined
  >();

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Handle file drop
  const handleDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    const newItems: FileItem[] = acceptedFiles.map((file) => ({
      file,
      title: getDefaultTitle(file.name),
    }));
    setFileItems((prev) => [...prev, ...newItems]);
  }, []);

  // Handle file deletion
  const handleDelete = useCallback((file: FileWithPath) => {
    setFileItems((prev) => prev.filter((item) => item.file !== file));
  }, []);

  // Handle title change
  const handleTitleChange = useCallback(
    (file: FileWithPath, newTitle: string) => {
      setFileItems((prev) =>
        prev.map((item) =>
          item.file === file ? { ...item, title: newTitle } : item,
        ),
      );
    },
    [],
  );

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (fileItems.length === 0) return;

    setIsUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((current) => {
          const next = current + 10;
          if (next >= 90) {
            clearInterval(interval);
            return 90;
          }
          return next;
        });
      }, 300);

      const files = fileItems.map((item) => item.file as File);
      const fileMetadata: IFileMetadata[] = fileItems.map((item) => ({
        filename: item.file.name,
        title: item.title,
      }));

      await onUpload({
        files,
        fileMetadata,
        defaultOptions: {
          tags: tags.length > 0 ? tags : undefined,
          description: description.length > 0 ? description : undefined,
          rating: rating !== SubmissionRating.GENERAL ? rating : undefined,
        },
        templateId: selectedTemplateId,
      });

      clearInterval(interval);
      setProgress(100);

      notifications.show({
        message: <Trans>Files have been uploaded successfully</Trans>,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reset and close
      setTimeout(() => {
        setIsUploading(false);
        setFileItems([]);
        setTags([]);
        setDescription(DefaultDescription());
        setRating(SubmissionRating.GENERAL);
        setSelectedTemplateId(undefined);
        onClose();
      }, 500);
    } catch (error) {
      notifications.show({
        message: (error as Error).message || <Trans>Error</Trans>,
        color: 'red',
        icon: <IconExclamationCircle size={16} />,
      });
      setIsUploading(false);
    }
  }, [
    fileItems,
    tags,
    description,
    rating,
    selectedTemplateId,
    onUpload,
    onClose,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isUploading) {
      onClose();
    }
  }, [isUploading, onClose]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && opened && !isUploading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [opened, isUploading, onClose]);

  return (
    <Portal target="#root">
      <Transition mounted={opened} transition="fade" duration={200}>
        {(styles) => (
          <Overlay
            fixed
            style={styles}
            className="postybirb__file_submission_modal_overlay"
          >
            <Paper radius={0} className="postybirb__file_submission_modal">
              {/* Header */}
              <Group
                justify="space-between"
                p="md"
                className="postybirb__file_submission_modal_header"
              >
                <Text size="lg" fw={500}>
                  <Trans>Add File Submission</Trans>
                </Text>
                <CloseButton
                  onClick={handleClose}
                  disabled={isUploading}
                  size="lg"
                />
              </Group>

              {/* Dropzone */}
              <FileDropzone
                onDrop={handleDrop}
                isUploading={isUploading}
                type={type}
              />

              {/* Main content area - Two columns */}
              <Flex
                p="md"
                gap="md"
                className="postybirb__file_submission_modal_content"
              >
                {/* Left column - File list */}
                <FileList
                  fileItems={fileItems}
                  onDelete={handleDelete}
                  onTitleChange={handleTitleChange}
                />

                {/* Right column - Options */}
                <SubmissionOptions
                  type={type}
                  rating={rating}
                  onRatingChange={setRating}
                  tags={tags}
                  onTagsChange={setTags}
                  description={description}
                  onDescriptionChange={setDescription}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={setSelectedTemplateId}
                />
              </Flex>

              {/* Footer - Upload button */}
              <Box p="md" className="postybirb__file_submission_modal_footer">
                {isUploading && (
                  <Progress value={progress} mb="xs" size="sm" radius="xl" />
                )}
                <Button
                  loading={isUploading}
                  onClick={handleUpload}
                  variant={isUploading ? 'light' : 'filled'}
                  leftSection={<IconFileUpload size={16} />}
                  disabled={fileItems.length === 0}
                  fullWidth
                  radius="md"
                  size="md"
                >
                  <Trans>Upload</Trans>
                </Button>
              </Box>
            </Paper>
          </Overlay>
        )}
      </Transition>
    </Portal>
  );
}
