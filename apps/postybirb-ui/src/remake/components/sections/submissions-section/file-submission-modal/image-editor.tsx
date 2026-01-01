/**
 * ImageEditor - Modern image cropping/editing popover.
 *
 * Features:
 * - Cropper.js integration
 * - Aspect ratio presets
 * - Zoom controls
 * - Rotation controls
 * - Flip controls
 * - Preview before applying
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import {
  IconCheck,
  IconCrop,
  IconFlipHorizontal,
  IconFlipVertical,
  IconRefresh,
  IconRotate,
  IconRotateClockwise,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import './file-submission-modal.css';

export interface ImageEditorProps {
  /** File to edit */
  file: FileWithPath;
  /** Whether the editor is open */
  opened: boolean;
  /** Callback when editor is closed */
  onClose: () => void;
  /** Callback when edit is applied */
  onApply: (file: FileWithPath, editedBlob: Blob) => void;
}

/** Aspect ratio presets - these are UI labels not user-facing text */
/* eslint-disable lingui/no-unlocalized-strings */
const ASPECT_RATIOS = [
  { label: 'Free', value: 'free', ratio: NaN },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:3', value: '4:3', ratio: 4 / 3 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: '3:2', value: '3:2', ratio: 3 / 2 },
  { label: '2:3', value: '2:3', ratio: 2 / 3 },
] as const;
/* eslint-enable lingui/no-unlocalized-strings */

/**
 * Modern image editor with cropping, rotation, and zoom.
 */
export function ImageEditor({
  file,
  opened,
  onClose,
  onApply,
}: ImageEditorProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('free');
  const [zoom, setZoom] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Create object URL for the image
  useEffect(() => {
    if (opened && file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setImageUrl(null);
      };
    }
    return undefined;
  }, [opened, file]);

  // Initialize Cropper when image loads
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || cropperRef.current) return;

    const cropper = new Cropper(imageRef.current, {
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
      ready() {
        setIsReady(true);
      },
      crop() {
        setHasChanges(true);
      },
      zoom(event) {
        // Update zoom slider when zooming with scroll/pinch
        const newZoom = Math.round((event.detail.ratio - 1) * 100);
        setZoom(Math.max(-50, Math.min(100, newZoom)));
      },
    });

    cropperRef.current = cropper;
  }, []);

  // Cleanup cropper on close
  useEffect(() => {
    if (!opened) {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
      setIsReady(false);
      setAspectRatio('free');
      setZoom(0);
      setHasChanges(false);
    }
  }, [opened]);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((value: string) => {
    setAspectRatio(value);
    const selected = ASPECT_RATIOS.find((ar) => ar.value === value);
    if (selected && cropperRef.current) {
      cropperRef.current.setAspectRatio(selected.ratio);
      setHasChanges(true);
    }
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((value: number) => {
    setZoom(value);
    if (cropperRef.current) {
      cropperRef.current.zoomTo(1 + value / 100);
    }
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 10, 100);
      if (cropperRef.current) {
        cropperRef.current.zoomTo(1 + newZoom / 100);
      }
      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 10, -50);
      if (cropperRef.current) {
        cropperRef.current.zoomTo(1 + newZoom / 100);
      }
      return newZoom;
    });
  }, []);

  // Rotation controls
  const handleRotateLeft = useCallback(() => {
    cropperRef.current?.rotate(-90);
    setHasChanges(true);
  }, []);

  const handleRotateRight = useCallback(() => {
    cropperRef.current?.rotate(90);
    setHasChanges(true);
  }, []);

  // Flip controls
  const handleFlipHorizontal = useCallback(() => {
    if (cropperRef.current) {
      const data = cropperRef.current.getData();
      cropperRef.current.scaleX(data.scaleX === -1 ? 1 : -1);
      setHasChanges(true);
    }
  }, []);

  const handleFlipVertical = useCallback(() => {
    if (cropperRef.current) {
      const data = cropperRef.current.getData();
      cropperRef.current.scaleY(data.scaleY === -1 ? 1 : -1);
      setHasChanges(true);
    }
  }, []);

  // Reset all changes
  const handleReset = useCallback(() => {
    if (cropperRef.current) {
      cropperRef.current.reset();
      setAspectRatio('free');
      setZoom(0);
      setHasChanges(false);
    }
  }, []);

  // Apply changes and close
  const handleApply = useCallback(() => {
    if (!cropperRef.current) return;

    const canvas = cropperRef.current.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onApply(file, blob);
          onClose();
        }
      },
      file.type || 'image/jpeg',
      0.95, // High quality
    );
  }, [file, onApply, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!opened) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, onClose, handleApply]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      fullScreen
      padding={0}
      withCloseButton={false}
      classNames={{
        body: 'postybirb__image_editor_modal_body',
        content: 'postybirb__image_editor_modal_content',
      }}
      zIndex="var(--z-popover)"
    >
      <Flex direction="column" h="100vh">
        {/* Header */}
        <Paper
          p="sm"
          radius={0}
          className="postybirb__image_editor_header"
          withBorder
        >
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconCrop size={20} />
              </ThemeIcon>
              <div>
                <Text fw={500} size="sm">
                  <Trans>Edit Image</Trans>
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {file.name}
                </Text>
              </div>
              {hasChanges && (
                <Badge size="sm" variant="light" color="yellow">
                  <Trans>Modified</Trans>
                </Badge>
              )}
            </Group>
            <Group gap="xs">
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={onClose}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleApply}
                disabled={!isReady}
              >
                <Trans>Apply</Trans>
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Main content */}
        <Flex flex={1} style={{ minHeight: 0 }}>
          {/* Image canvas */}
          <Box flex={1} p="md" className="postybirb__image_editor_canvas">
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt={file.name}
                onLoad={handleImageLoad}
                className="postybirb__image_editor_image"
                loading="lazy"
              />
            )}
          </Box>

          {/* Toolbar sidebar */}
          <Paper
            p="md"
            radius={0}
            withBorder
            className="postybirb__image_editor_sidebar"
          >
            <Stack gap="lg">
              {/* Aspect Ratio */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  <Trans>Aspect Ratio</Trans>
                </Text>
                <SegmentedControl
                  value={aspectRatio}
                  onChange={handleAspectRatioChange}
                  data={ASPECT_RATIOS.map((ar) => ({
                    label: ar.label,
                    value: ar.value,
                  }))}
                  fullWidth
                  size="xs"
                  disabled={!isReady}
                />
              </div>

              <Divider />

              {/* Zoom */}
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    <Trans>Zoom</Trans>
                  </Text>
                  <Text size="xs" c="dimmed">
                    {zoom > 0 ? '+' : ''}
                    {zoom}%
                  </Text>
                </Group>
                <Group gap="xs" align="center">
                  <Tooltip label={<Trans>Zoom out</Trans>}>
                    <ActionIcon
                      variant="light"
                      onClick={handleZoomOut}
                      disabled={!isReady || zoom <= -50}
                    >
                      <IconZoomOut size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Slider
                    value={zoom}
                    onChange={handleZoomChange}
                    min={-50}
                    max={100}
                    step={5}
                    flex={1}
                    disabled={!isReady}
                    label={(value) => `${value > 0 ? '+' : ''}${value}%`}
                  />
                  <Tooltip label={<Trans>Zoom in</Trans>}>
                    <ActionIcon
                      variant="light"
                      onClick={handleZoomIn}
                      disabled={!isReady || zoom >= 100}
                    >
                      <IconZoomIn size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>

              <Divider />

              {/* Rotate */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  <Trans>Rotate</Trans>
                </Text>
                <Group gap="xs">
                  <Tooltip label={<Trans>Rotate left 90°</Trans>}>
                    <ActionIcon
                      variant="light"
                      size="lg"
                      onClick={handleRotateLeft}
                      disabled={!isReady}
                    >
                      <IconRotate size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={<Trans>Rotate right 90°</Trans>}>
                    <ActionIcon
                      variant="light"
                      size="lg"
                      onClick={handleRotateRight}
                      disabled={!isReady}
                    >
                      <IconRotateClockwise size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>

              <Divider />

              {/* Flip */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  <Trans>Flip</Trans>
                </Text>
                <Group gap="xs">
                  <Tooltip label={<Trans>Flip horizontal</Trans>}>
                    <ActionIcon
                      variant="light"
                      size="lg"
                      onClick={handleFlipHorizontal}
                      disabled={!isReady}
                    >
                      <IconFlipHorizontal size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={<Trans>Flip vertical</Trans>}>
                    <ActionIcon
                      variant="light"
                      size="lg"
                      onClick={handleFlipVertical}
                      disabled={!isReady}
                    >
                      <IconFlipVertical size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>

              <Divider />

              {/* Reset */}
              <Button
                variant="light"
                color="gray"
                leftSection={<IconRefresh size={16} />}
                onClick={handleReset}
                disabled={!isReady || !hasChanges}
                fullWidth
              >
                <Trans>Reset</Trans>
              </Button>

              {/* Tips */}
              <Paper
                p="sm"
                radius="sm"
                bg="var(--mantine-color-dark-6)"
                shadow="none"
              >
                <Text size="xs" c="dimmed">
                  <Trans>Tips</Trans>:
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  • <Trans>Double-click to toggle crop/move mode</Trans>
                </Text>
                <Text size="xs" c="dimmed">
                  • <Trans>Scroll to zoom</Trans>
                </Text>
                <Text size="xs" c="dimmed">
                  • <Trans>Ctrl+Enter to apply</Trans>
                </Text>
              </Paper>
            </Stack>
          </Paper>
        </Flex>
      </Flex>
    </Modal>
  );
}
