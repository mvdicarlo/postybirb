import { Trans } from '@lingui/macro';
import {
  Box,
  Divider,
  Grid,
  Group,
  NumberInput,
  Text,
  Tooltip,
  ActionIcon,
  Badge,
  Button,
} from '@mantine/core';
import {
  FileMetadataFields,
  IAccount,
  ISubmissionFileDto,
} from '@postybirb/types';
import { IconInfoCircle, IconRestore } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { CustomAccountDimensions } from './custom-account-dimensions';
import {
  updateFileDimensions,
  computeScale,
  formatAspect,
  rawAspect,
} from './file-dimensions-helpers';

type FileDetailProps = {
  file: ISubmissionFileDto;
  metadata: FileMetadataFields;
  accounts: IAccount[];
  save: () => void;
};

export function FileDimensions(props: FileDetailProps) {
  const { accounts, file, metadata, save } = props;

  const { width: providedWidth, height: providedHeight } =
    metadata.dimensions.default ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);
  const aspectRef = useRef(file.width / file.height);

  const original = { h: file.height, w: file.width };
  const scale = computeScale(height, width, original.h, original.w);
  const aspectText = formatAspect(height, width);

  // Debounced save when height/width change
  const debounceTimer = useRef<number | null>(null);
  useEffect(() => {
    updateFileDimensions(metadata, file, height, width);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      save();
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, width]);

  const setHeightLocked = (h: number) => {
    const ratio = aspectRef.current; // width/height (fixed to original)
    const clampedH = Math.min(h, original.h);
    const newW = Math.min(Math.round(clampedH * ratio), original.w);
    setHeight(clampedH || 1);
    setWidth(newW || 1);
  };

  const setWidthLocked = (w: number) => {
    const ratio = aspectRef.current; // width/height
    const clampedW = Math.min(w, original.w);
    const newH = Math.min(Math.round(clampedW / ratio), original.h);
    setWidth(clampedW || 1);
    setHeight(newH || 1);
  };

  const reset = () => {
    setHeight(original.h);
    setWidth(original.w);
  };

  return (
    <Box pt="xs">
      {/* Header */}
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap={6}>
          <Text size="sm" fw={600}>
            <Trans>Dimensions</Trans>
          </Text>
          <Tooltip
            label={
              <Trans>Adjust dimensions while maintaining aspect ratio</Trans>
            }
            withArrow
          >
            <IconInfoCircle size={14} style={{ opacity: 0.7 }} />
          </Tooltip>
          <Badge
            size="xs"
            variant="light"
            color={scale.percent === 100 ? 'gray' : 'blue'}
          >
            {scale.percent}%
          </Badge>
          {aspectText && (
            <Tooltip
              label={`${rawAspect(width, height)} (~${aspectText})`}
              withArrow
            >
              <Text size="xs" c="dimmed">
                {aspectText}
              </Text>
            </Tooltip>
          )}
        </Group>
        <Group gap={4}>
          <Tooltip label={<Trans>Reset to original</Trans>}>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={reset}
              aria-label="reset-dimensions"
            >
              <IconRestore size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Group gap="xs" align="end" wrap="nowrap" mb="sm">
        <NumberInput
          label={<Trans>Height</Trans>}
          value={height}
          max={original.h}
          min={1}
          size="xs"
          step={10}
          onChange={(val) => setHeightLocked(Number(val) || 1)}
          styles={{ input: { width: 90 } }}
        />
        <Text px={4} pb={4}>
          ×
        </Text>
        <NumberInput
          label={<Trans>Width</Trans>}
          value={width}
          max={original.w}
          min={1}
          size="xs"
          step={10}
          onChange={(val) => setWidthLocked(Number(val) || 1)}
          styles={{ input: { width: 90 } }}
        />
        <Group gap={4} mb={6}>
          {([100, 75, 50, 25] as const).map((p) => {
            const active = Math.round(scale.percent) === p;
            return (
              <Button
                key={p}
                size="compact-xs"
                variant={active ? 'filled' : 'light'}
                color={active ? 'blue' : 'gray'}
                onClick={() => {
                  const targetH = Math.max(
                    1,
                    Math.round(original.h * (p / 100)),
                  );
                  setHeightLocked(targetH);
                }}
              >
                {p}%
              </Button>
            );
          })}
        </Group>
      </Group>
      <Divider my="xs" variant="dashed" />
      <CustomAccountDimensions
        accounts={accounts}
        file={file}
        metadata={metadata}
        save={save}
      />
    </Box>
  );
}
