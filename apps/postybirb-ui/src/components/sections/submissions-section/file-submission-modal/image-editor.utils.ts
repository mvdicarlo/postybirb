import type Cropper from 'cropperjs';

export function getFittedZoom(
  cropper: Pick<Cropper, 'getCanvasData' | 'getContainerData'>,
): number {
  const { naturalWidth, naturalHeight } = cropper.getCanvasData();
  const container = cropper.getContainerData();
  return Math.min(
    container.width / naturalWidth,
    container.height / naturalHeight,
  );
}

export function fitImageToContainer(
  cropper: Pick<
    Cropper,
    'clear' | 'crop' | 'getCanvasData' | 'getContainerData' | 'setCanvasData'
  >,
): void {
  cropper.clear();
  const { naturalWidth, naturalHeight } = cropper.getCanvasData();
  const container = cropper.getContainerData();
  const scale = getFittedZoom(cropper);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  cropper.setCanvasData({
    left: (container.width - width) / 2,
    top: (container.height - height) / 2,
    width,
    height,
  });
  cropper.crop();
}
