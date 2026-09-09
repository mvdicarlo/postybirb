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

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    LoadingOverlay,
    Modal,
    Radio,
    SimpleGrid,
    Slider,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import {
    IconArrowsMove,
    IconCheck,
    IconCrop,
    IconFlipHorizontal,
    IconFlipVertical,
    IconPhoto,
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
import { fitImageToContainer, getFittedZoom } from './image-editor.utils';

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
  { label: 'Original', value: 'original', ratio: NaN },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:5', value: '4:5', ratio: 4 / 5 },
  { label: '1.91:1', value: '1.91:1', ratio: 1.91 / 1 },
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
  const [zoom, setZoom] = useState(100);
  const [hasChanges, setHasChanges] = useState(false);
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  const [dragMode, setDragMode] = useState<'crop' | 'move'>('move');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fittedContainer = useRef<Cropper.ContainerData | null>(null);
  const initialCrop = useRef<Cropper.Data | null>(null);
  const applying = useRef(false);

  // Create object URL for the image
  useEffect(() => {
    setIsReady(false);
    setAspectRatio('free');
    setZoom(100);
    setHasChanges(false);
    setCropSize({ width: 0, height: 0 });
    setDragMode('move');
    setError(null);
    setIsApplying(false);
    applying.current = false;
    fittedContainer.current = null;
    initialCrop.current = null;
    if (!opened) {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      URL.revokeObjectURL(url);
    };
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
      toggleDragModeOnDblclick: false,
      ready() {
        fittedContainer.current = cropper.getContainerData();
        initialCrop.current = cropper.getData();
        setZoom(100);
        setHasChanges(false);
        setIsReady(true);
      },
      crop(event) {
        const container = cropper.getContainerData();
        const previousContainer = fittedContainer.current;
        if (
          previousContainer &&
          (previousContainer.width !== container.width ||
            previousContainer.height !== container.height)
        ) {
          fittedContainer.current = container;
          fitImageToContainer(cropper);
          return;
        }
        setCropSize({
          width: Math.round(event.detail.width),
          height: Math.round(event.detail.height),
        });
        if (initialCrop.current) {
          const original = initialCrop.current;
          const data = event.detail;
          setHasChanges(
            (
              [
                'x',
                'y',
                'width',
                'height',
                'rotate',
                'scaleX',
                'scaleY',
              ] as const
            ).some(
              (property) => Math.abs(data[property] - original[property]) > 0.1,
            ),
          );
          const imageData = cropper.getImageData();
          setZoom(
            Math.round(
              (imageData.width /
                imageData.naturalWidth /
                getFittedZoom(cropper)) *
                100,
            ),
          );
        }
      },
      zoom(event) {
        const nextZoom = (event.detail.ratio / getFittedZoom(cropper)) * 100;
        if (nextZoom < 50 || nextZoom > 300) {
          event.preventDefault();
        }
      },
    });

    cropperRef.current = cropper;
  }, []);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((value: string) => {
    setAspectRatio(value);
    const selected = ASPECT_RATIOS.find((ar) => ar.value === value);
    const cropper = cropperRef.current;
    if (!selected || !cropper) return;

    if (value === 'original') {
      cropper.clear();
      const { naturalWidth, naturalHeight } = cropper.getCanvasData();
      cropper.setAspectRatio(naturalWidth / naturalHeight);
      fitImageToContainer(cropper);
      cropper.setData({ x: 0, y: 0, width: naturalWidth, height: naturalHeight });
    } else {
      cropper.setAspectRatio(selected.ratio);
    }
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((value: number) => {
    if (cropperRef.current) {
      cropperRef.current.zoomTo(
        (getFittedZoom(cropperRef.current) * value) / 100,
      );
    }
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    handleZoomChange(Math.min(zoom + 10, 300));
  }, [handleZoomChange, zoom]);

  const handleZoomOut = useCallback(() => {
    handleZoomChange(Math.max(zoom - 10, 50));
  }, [handleZoomChange, zoom]);

  // Rotation controls
  const handleRotateLeft = useCallback(() => {
    cropperRef.current?.rotate(-90);
  }, []);

  const handleRotateRight = useCallback(() => {
    cropperRef.current?.rotate(90);
  }, []);

  // Flip controls
  const handleFlipHorizontal = useCallback(() => {
    if (cropperRef.current) {
      const data = cropperRef.current.getData();
      cropperRef.current.scaleX(data.scaleX === -1 ? 1 : -1);
    }
  }, []);

  const handleFlipVertical = useCallback(() => {
    if (cropperRef.current) {
      const data = cropperRef.current.getData();
      cropperRef.current.scaleY(data.scaleY === -1 ? 1 : -1);
    }
  }, []);

  // Reset all changes
  const handleReset = useCallback(() => {
    const cropper = cropperRef.current;
    const original = initialCrop.current;
    if (cropper && original) {
      cropper.clear();
      cropper.setAspectRatio(NaN);
      cropper.setData(original);
      fitImageToContainer(cropper);
      cropper.setData(original);
      cropper.setDragMode('move');
      setAspectRatio('free');
      setDragMode('move');
      setZoom(100);
      setHasChanges(false);
      setError(null);
    }
  }, []);

  // Apply changes and close
  const handleApply = useCallback(async () => {
    const cropper = cropperRef.current;
    if (!cropper || !isReady || applying.current) return;
    applying.current = true;
    setIsApplying(true);
    setError(null);
    try {
      const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, file.type || 'image/jpeg', 0.95);
      });
      if (cropperRef.current !== cropper) return;
      if (blob) {
        onApply(file, blob);
        onClose();
      } else {
        setError(t`Failed to edit image`);
      }
    } catch {
      if (cropperRef.current === cropper) setError(t`Failed to edit image`);
    } finally {
      if (cropperRef.current === cropper) {
        applying.current = false;
        setIsApplying(false);
      }
    }
  }, [file, isReady, onApply, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!opened) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, handleApply]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      fullScreen
      padding={0}
      title={t`Edit image`}
      closeOnEscape={!isApplying}
      withCloseButton={false}
      classNames={{
        body: 'postybirb__image_editor_modal_body',
        content: 'postybirb__image_editor_modal_content',
        header: 'postybirb__image_editor_modal_heading',
      }}
      zIndex="var(--z-popover)"
    >
      <div className="postybirb__image_editor_layout">
        <header className="postybirb__image_editor_header">
          <Group
            gap="sm"
            wrap="nowrap"
            className="postybirb__image_editor_identity"
          >
            <IconCrop size={22} style={{ flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
              <Text fw={600} size="sm">
                <Trans>Edit image</Trans>
              </Text>
              <Text size="xs" c="dimmed" truncate title={file.name}>
                {file.name}
              </Text>
            </Box>
          </Group>
          <Group
            gap="xs"
            wrap="nowrap"
            className="postybirb__image_editor_commands"
          >
            <Tooltip label={<Trans>Reset</Trans>}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={handleReset}
                disabled={
                  !isReady ||
                  isApplying ||
                  (!hasChanges && aspectRatio === 'free')
                }
                aria-label={t`Reset`}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconX size={16} />}
              onClick={onClose}
              disabled={isApplying}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleApply}
              disabled={!isReady}
              loading={isApplying}
            >
              <Trans>Apply</Trans>
            </Button>
          </Group>
        </header>

        <div className="postybirb__image_editor_workspace">
          <div className="postybirb__image_editor_stage">
            <Box className="postybirb__image_editor_canvas">
              <LoadingOverlay visible={!isReady && !error} />
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={file.name}
                  onLoad={handleImageLoad}
                  onError={() => setError(t`Failed to load file for editing.`)}
                  className="postybirb__image_editor_image"
                />
              )}
            </Box>
            <div className="postybirb__image_editor_status">
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  <Trans>Dimensions</Trans>
                </Text>
                <Text size="xs" ff="monospace">
                  <Trans>
                    {cropSize.width} × {cropSize.height} px
                  </Trans>
                </Text>
              </Group>
              {hasChanges && (
                <Badge size="xs" variant="light" color="gray">
                  <Trans>Modified</Trans>
                </Badge>
              )}
            </div>
          </div>

          <aside className="postybirb__image_editor_sidebar">
            <Stack gap="lg">
              {error && (
                <Alert color="red" role="alert">
                  {error}
                </Alert>
              )}
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  <Trans>Crop</Trans>
                </Text>
                <ActionIcon.Group>
                  <Tooltip label={<Trans>Crop</Trans>}>
                    <ActionIcon
                      variant={dragMode === 'crop' ? 'filled' : 'default'}
                      size="lg"
                      aria-label={t`Crop`}
                      aria-pressed={dragMode === 'crop'}
                      disabled={!isReady || isApplying}
                      onClick={() => {
                        cropperRef.current?.setDragMode('crop');
                        setDragMode('crop');
                      }}
                    >
                      <IconCrop size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={<Trans>Move</Trans>}>
                    <ActionIcon
                      variant={dragMode === 'move' ? 'filled' : 'default'}
                      size="lg"
                      aria-label={t`Move`}
                      aria-pressed={dragMode === 'move'}
                      disabled={!isReady || isApplying}
                      onClick={() => {
                        cropperRef.current?.setDragMode('move');
                        setDragMode('move');
                      }}
                    >
                      <IconArrowsMove size={18} />
                    </ActionIcon>
                  </Tooltip>
                </ActionIcon.Group>
              </Group>
              <Radio.Group
                value={aspectRatio}
                onChange={handleAspectRatioChange}
                label={<Trans>Aspect Ratio</Trans>}
              >
                <SimpleGrid cols={3} spacing="xs" mt="xs">
                  {ASPECT_RATIOS.map((preset) => (
                    <Radio.Card
                      key={preset.value}
                      value={preset.value}
                      disabled={!isReady || isApplying}
                      aria-label={
                        preset.value === 'free'
                          ? t`Free`
                          : preset.value === 'original'
                            ? t`Original`
                            : preset.label
                      }
                      className="postybirb__image_editor_ratio"
                    >
                      {preset.value === 'free' ? (
                        <IconCrop size={24} />
                      ) : preset.value === 'original' ? (
                        <IconPhoto size={24} />
                      ) : (
                        <span
                          className="postybirb__image_editor_ratio_shape"
                          aria-hidden="true"
                          style={{
                            width: 28 * Math.min(1, preset.ratio),
                            height: 28 / Math.max(1, preset.ratio),
                          }}
                        />
                      )}
                      <Text size="xs">
                        {preset.value === 'free' ? (
                          <Trans>Free</Trans>
                        ) : preset.value === 'original' ? (
                          <Trans>Original</Trans>
                        ) : (
                          preset.label
                        )}
                      </Text>
                    </Radio.Card>
                  ))}
                </SimpleGrid>
              </Radio.Group>

              <Divider />

              {/* Zoom */}
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    <Trans>Zoom</Trans>
                  </Text>
                  <Text size="xs" c="dimmed">
                    {zoom}%
                  </Text>
                </Group>
                <Group gap="xs" align="center">
                  <Tooltip label={<Trans>Zoom out</Trans>}>
                    <ActionIcon
                      variant="light"
                      onClick={handleZoomOut}
                      disabled={!isReady || isApplying || zoom <= 50}
                      aria-label={t`Zoom out`}
                    >
                      <IconZoomOut size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Slider
                    value={zoom}
                    onChange={handleZoomChange}
                    min={50}
                    max={300}
                    step={5}
                    flex={1}
                    disabled={!isReady || isApplying}
                    thumbLabel={t`Zoom`}
                    label={(value) => `${value}%`}
                  />
                  <Tooltip label={<Trans>Zoom in</Trans>}>
                    <ActionIcon
                      variant="light"
                      onClick={handleZoomIn}
                      disabled={!isReady || isApplying || zoom >= 300}
                      aria-label={t`Zoom in`}
                    >
                      <IconZoomIn size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>

              <Divider />

              <SimpleGrid cols={2} spacing="md">
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
                        disabled={!isReady || isApplying}
                        aria-label={t`Rotate left 90°`}
                      >
                        <IconRotate size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={<Trans>Rotate right 90°</Trans>}>
                      <ActionIcon
                        variant="light"
                        size="lg"
                        onClick={handleRotateRight}
                        disabled={!isReady || isApplying}
                        aria-label={t`Rotate right 90°`}
                      >
                        <IconRotateClockwise size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </div>

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
                        disabled={!isReady || isApplying}
                        aria-label={t`Flip horizontal`}
                      >
                        <IconFlipHorizontal size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={<Trans>Flip vertical</Trans>}>
                      <ActionIcon
                        variant="light"
                        size="lg"
                        onClick={handleFlipVertical}
                        disabled={!isReady || isApplying}
                        aria-label={t`Flip vertical`}
                      >
                        <IconFlipVertical size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </div>
              </SimpleGrid>
            </Stack>
          </aside>
        </div>
      </div>
    </Modal>
  );
}
