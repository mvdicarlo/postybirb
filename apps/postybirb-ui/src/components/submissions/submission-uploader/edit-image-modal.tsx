import { Trans } from '@lingui/macro';
import { Box, Button, Modal } from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { ISubmissionFileDto } from '@postybirb/types';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useEffect, useState } from 'react';
import { defaultTargetProvider } from '../../../transports/http-client';

export function EditImageFromSource({
  file,
  onClose,
}: {
  file: ISubmissionFileDto;
  onClose: (edit?: ISubmissionFileDto, blob?: Blob | null) => void;
}) {
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [, setImageData] = useState<Cropper.ImageData | null>(null);
  const [hasCrop, setHasCrop] = useState(false);

  const setup = () => {
    const img = document.getElementById('crop-img') as HTMLImageElement;
    if (img && !cropper) {
      const c = new Cropper(img, {
        autoCropArea: 1,
        ready() {
          setImageData(c.getImageData());
        },
        crop() {
          if (hasCrop) return;
          setHasCrop(true);
        },
      });
      setCropper(c);
    }
  };

  useEffect(
    () => () => {
      if (cropper) {
        cropper.destroy();
        setCropper(null);
      }
    },
    [cropper],
  );

  return (
    <Modal key="cropper-modal" fullScreen opened onClose={onClose}>
      <Modal.Body p={6}>
        <img
          id="crop-img"
          key={file.fileName}
          src={`${defaultTargetProvider()}/api/file/file/${file.id}?${
            file.hash
          }`}
          style={{ height: 'calc(100vh - 175px)', width: '100%' }}
          onLoad={() => {
            setup();
          }}
          alt={file.fileName}
        />
        <Box ta="center" mt="xs">
          <Button
            w="50%"
            onClick={() =>
              cropper
                ?.getCroppedCanvas()
                .toBlob((blob) => onClose(file, blob), file.mimeType, 1)
            }
          >
            <Trans>Crop</Trans>
          </Button>
        </Box>
      </Modal.Body>
    </Modal>
  );
}

export function EditImageModal({
  file,
  onClose,
}: {
  file: FileWithPath;
  onClose: (edit?: FileWithPath, blob?: Blob | null) => void;
}) {
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [, setImageData] = useState<Cropper.ImageData | null>(null);
  const [hasCrop, setHasCrop] = useState(false);

  const setup = () => {
    const img = document.getElementById('crop-img') as HTMLImageElement;
    if (img && !cropper) {
      const c = new Cropper(img, {
        autoCropArea: 1,
        ready() {
          setImageData(c.getImageData());
        },
        crop() {
          if (hasCrop) return;
          setHasCrop(true);
        },
      });
      setCropper(c);
    }
  };

  useEffect(
    () => () => {
      if (cropper) {
        cropper.destroy();
        setCropper(null);
      }
    },
    [cropper],
  );

  return (
    <Modal key="cropper-modal" fullScreen opened onClose={onClose}>
      <Modal.Body p={6}>
        <img
          id="crop-img"
          key={file.name}
          src={URL.createObjectURL(file)}
          style={{ height: 'calc(100vh - 175px)', width: '100%' }}
          onLoad={() => {
            URL.revokeObjectURL(file.name);
            setup();
          }}
          alt={file.name}
        />
        <Box ta="center" mt="xs">
          <Button
            w="50%"
            onClick={() =>
              cropper
                ?.getCroppedCanvas()
                .toBlob((blob) => onClose(file, blob), file.type, 1)
            }
          >
            <Trans>Crop</Trans>
          </Button>
        </Box>
      </Modal.Body>
    </Modal>
  );
}
