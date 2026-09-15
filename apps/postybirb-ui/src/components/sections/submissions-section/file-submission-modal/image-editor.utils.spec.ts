import { fitImageToContainer, getFittedZoom } from './image-editor.utils';

describe('image editor fitted zoom', () => {
  const smallContainer = { width: 320, height: 229 };
  const largeContainer = { width: 1320, height: 900 };

  function createCropper(container: { width: number; height: number }) {
    return {
      clear: jest.fn(),
      crop: jest.fn(),
      setCanvasData: jest.fn(),
      getContainerData: jest.fn(() => container),
      getCanvasData: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 1200,
        naturalWidth: 800,
        naturalHeight: 1200,
      })),
    };
  }

  it.each([
    [smallContainer, largeContainer],
    [largeContainer, smallContainer],
  ])(
    'uses the current viewport after resizing from %o to %o',
    (before, after) => {
      const cropper = createCropper(before);
      expect(getFittedZoom(cropper)).toBeCloseTo(before.height / 1200);

      cropper.getContainerData.mockReturnValue(after);
      const fittedRatio = after.height / 1200;
      expect(getFittedZoom(cropper)).toBeCloseTo(fittedRatio);
      expect((fittedRatio / getFittedZoom(cropper)) * 100).toBeCloseTo(100);

      const zoomedRatio = getFittedZoom(cropper) * 1.1;
      expect(zoomedRatio).toBeCloseTo(fittedRatio * 1.1);
      expect((zoomedRatio / getFittedZoom(cropper)) * 100).toBeCloseTo(110);
    },
  );

  it('fits the oriented image after a quarter-turn', () => {
    const cropper = createCropper(largeContainer);
    cropper.getCanvasData.mockReturnValue({
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      naturalWidth: 1200,
      naturalHeight: 800,
    });

    expect(getFittedZoom(cropper)).toBeCloseTo(1320 / 1200);
  });

  it('does not change the fit baseline when the image is zoomed', () => {
    const cropper = createCropper(largeContainer);
    const fittedRatio = getFittedZoom(cropper);
    cropper.getCanvasData.mockReturnValue({
      ...cropper.getCanvasData(),
      width: 1600,
      height: 2400,
    });

    expect(getFittedZoom(cropper)).toBe(fittedRatio);
  });

  it.each([smallContainer, largeContainer])(
    'clears the previous crop constraint before fitting to %o',
    (container) => {
      const cropper = createCropper(container);
      fitImageToContainer(cropper);

      const width = (800 * container.height) / 1200;
      const canvas = cropper.setCanvasData.mock.calls[0][0];
      expect(canvas.width).toBeCloseTo(width);
      expect(canvas.height).toBeCloseTo(container.height);
      expect(canvas.left).toBeCloseTo((container.width - width) / 2);
      expect(canvas.top).toBeCloseTo(0);
      expect(cropper.clear.mock.invocationCallOrder[0]).toBeLessThan(
        cropper.setCanvasData.mock.invocationCallOrder[0],
      );
      expect(cropper.setCanvasData.mock.invocationCallOrder[0]).toBeLessThan(
        cropper.crop.mock.invocationCallOrder[0],
      );
    },
  );
});
