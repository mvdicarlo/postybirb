import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  NumberInput,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IAccount,
  ISubmissionFileDto,
  SubmissionFileMetadata,
} from '@postybirb/types';
import { IconInfoCircle, IconRestore } from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomAccountDimensions } from './custom-account-dimensions';
import {
  computeScale,
  formatAspect,
  rawAspect,
  updateFileDimensions,
} from './file-dimensions-helpers';

type FileDetailProps = {
  file: ISubmissionFileDto;
  metadata: SubmissionFileMetadata;
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

  // Debounced save function
  const debouncedSave = useMemo(() => debounce(() => save(), 400), [save]);

  // Explicitly apply current dimensions to metadata and schedule save if changed from provided
  const applyDimensions = (nextH: number, nextW: number) => {
    // Clamp fallback values
    const safeH = nextH || 1;
    const safeW = nextW || 1;
    setHeight(safeH);
    setWidth(safeW);

    updateFileDimensions(metadata, file, safeH, safeW);

    debouncedSave();
  };

  // Cleanup only for debounce
  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  const setHeightLocked = (h: number) => {
    const ratio = aspectRef.current; // width/height (fixed to original)
    const clampedH = Math.min(h, original.h);
    const newW = Math.min(Math.round(clampedH * ratio), original.w);
    applyDimensions(clampedH || 1, newW || 1);
  };

  const setWidthLocked = (w: number) => {
    const ratio = aspectRef.current; // width/height
    const clampedW = Math.min(w, original.w);
    const newH = Math.min(Math.round(clampedW / ratio), original.h);
    applyDimensions(newH || 1, clampedW || 1);
  };

  const reset = () => {
    applyDimensions(original.h, original.w);
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
