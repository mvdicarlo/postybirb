import {
  ActionIcon,
  Box,
  Group,
  Image,
  Modal,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FileType, ISubmissionFileDto } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconDeviceAudioTape,
  IconDownload,
  IconFile,
  IconTextCaption,
  IconVideo,
  IconX,
  IconZoomIn,
} from '@tabler/icons-react';
import { useState } from 'react';
import { defaultTargetProvider } from '../../../transports/http-client';

type SubmissionFilePreviewProps = {
  file: ISubmissionFileDto;
  height: string | number;
  width: string | number;
};

export function SubmissionFilePreview(props: SubmissionFilePreviewProps) {
  const { file, height, width } = props;
  const type = getFileType(file.fileName);
  const [opened, { open, close }] = useDisclosure(false);
  // Hover state only used for image variant; kept outside conditional to satisfy hook rules
  const [hovered, setHovered] = useState(false);
  const sizeNumber = Math.min(Number(width), Number(height));

  const iconStyle = {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  };

  if (type === FileType.VIDEO) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="blue" style={iconStyle}>
          <IconVideo size={Math.min(Number(width), Number(height)) * 0.5} />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.AUDIO) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="grape" style={iconStyle}>
          <IconDeviceAudioTape
            size={Math.min(Number(width), Number(height)) * 0.5}
          />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.TEXT) {
    return (
      <Tooltip label={file.fileName}>
        <ThemeIcon variant="light" color="teal" style={iconStyle}>
          <IconTextCaption
            size={Math.min(Number(width), Number(height)) * 0.5}
          />
        </ThemeIcon>
      </Tooltip>
    );
  }

  if (type === FileType.IMAGE) {
    const thumbnailSrc = `${defaultTargetProvider()}/api/file/thumbnail/${file.id}`;
    const fullSrc = `${defaultTargetProvider()}/api/file/file/${file.id}`;
    return (
      <>
        <Tooltip label={file.fileName}>
          <Box
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
              }
            }}
            role="button"
            tabIndex={0}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width,
              height,
              overflow: 'hidden',
              borderRadius: '4px',
              cursor: 'zoom-in',
              // eslint-disable-next-line lingui/no-unlocalized-strings
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1) inset',
              position: 'relative',
              backgroundColor: '#1a1b1e',
            }}
          >
            <Image
              src={thumbnailSrc}
              alt={file.fileName}
              height={height}
              width={width}
              fit="cover"
              loading="lazy"
              style={{ objectPosition: 'center' }}
            />
            {/* Hover overlay */}
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.45)',
                color: 'white',
                opacity: hovered ? 1 : 0,
                // eslint-disable-next-line lingui/no-unlocalized-strings
                transition: 'opacity 120ms ease',
                pointerEvents: 'none',
                fontSize: sizeNumber * 0.25,
                backdropFilter: 'blur(1px)',
              }}
            >
              <IconZoomIn size={sizeNumber * 0.4} stroke={1.5} />
            </Box>
          </Box>
        </Tooltip>
        <Modal
          opened={opened}
          onClose={close}
          size="auto"
          centered
          withCloseButton={false}
          overlayProps={{ opacity: 0.4, blur: 2 }}
          styles={{
            content: { background: 'transparent', boxShadow: 'none' },
            body: { padding: 0 },
          }}
        >
          <Box style={{ position: 'relative' }}>
            <Image
              src={fullSrc}
              alt={file.fileName}
              fit="contain"
              radius="sm"
              // Allow image to scale to viewport while preserving aspect ratio
              style={{
                maxWidth: '85vw',
                maxHeight: '70vh',
                objectFit: 'contain',
                backgroundColor: '#0e0f11',
              }}
            />
            {/* Overlay controls */}
            <Group gap="xs" style={{ position: 'absolute', top: 8, right: 8 }}>
              <ActionIcon
                size="sm"
                variant="light"
                color="white"
                onClick={(e) => {
                  e.preventDefault();
                  fetch(fullSrc)
                    .then((response) => response.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = file.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                aria-label="Download file"
              >
                <IconDownload size={16} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="light"
                color="red"
                onClick={close}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                aria-label="Close"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          </Box>
        </Modal>
      </>
    );
  }

  return (
    <Tooltip label={file.fileName}>
      <ThemeIcon variant="light" color="gray" style={iconStyle}>
        <IconFile size={Math.min(Number(width), Number(height)) * 0.5} />
      </ThemeIcon>
    </Tooltip>
  );
}
