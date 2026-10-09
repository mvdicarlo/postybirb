import { ImageResizeProps, ISubmissionFile } from '@postybirb/types';
import { getSupportedFileSize } from '../../websites/decorators/supports-files.decorator';
import { UnknownWebsite } from '../../websites/website';

type ImageResizeWebsite = UnknownWebsite & {
  calculateImageResize?: (
    file: ISubmissionFile,
  ) => ImageResizeProps | undefined;
};

type ResizeDimensions = Pick<ImageResizeProps, 'width' | 'height'>;

function getResizeScale(
  file: ISubmissionFile,
  dimensions: ResizeDimensions,
): number | undefined {
  const scales: number[] = [];
  if (dimensions.width && file.width) {
    scales.push(dimensions.width / file.width);
  }
  if (dimensions.height && file.height) {
    scales.push(dimensions.height / file.height);
  }
  return scales.length > 0 ? Math.min(...scales) : undefined;
}

function selectResizeDimensions(
  file: ISubmissionFile,
  userDimensions?: ResizeDimensions,
  websiteDimensions?: ResizeDimensions,
): ResizeDimensions | undefined {
  if (!userDimensions) return websiteDimensions;
  if (!websiteDimensions) return userDimensions;

  const userScale = getResizeScale(file, userDimensions);
  const websiteScale = getResizeScale(file, websiteDimensions);
  return websiteScale !== undefined &&
    (userScale === undefined || websiteScale < userScale)
    ? websiteDimensions
    : userDimensions;
}

export function getImageResizeParameters(
  instance: ImageResizeWebsite,
  file: ISubmissionFile,
): ImageResizeProps | undefined {
  const websiteParams = instance.calculateImageResize?.(file);
  let resizeParams = websiteParams ? { ...websiteParams } : undefined;
  const requestedUserDimensions =
    file.metadata.dimensions?.[instance.accountId] ??
    file.metadata.dimensions?.default;
  const userDimensions = requestedUserDimensions
    ? {
        width: requestedUserDimensions.width
          ? Math.min(file.width || Infinity, requestedUserDimensions.width)
          : undefined,
        height: requestedUserDimensions.height
          ? Math.min(file.height || Infinity, requestedUserDimensions.height)
          : undefined,
      }
    : undefined;
  const websiteDimensions = websiteParams?.width || websiteParams?.height
    ? { width: websiteParams.width, height: websiteParams.height }
    : undefined;
  const selectedDimensions = selectResizeDimensions(
    file,
    userDimensions,
    websiteDimensions,
  );

  if (resizeParams) {
    delete resizeParams.width;
    delete resizeParams.height;
  }
  if (selectedDimensions) {
    resizeParams = resizeParams ?? {};
    resizeParams.width = selectedDimensions.width;
    resizeParams.height = selectedDimensions.height;
  }

  if (!resizeParams?.maxBytes) {
    const supportedFileSize = getSupportedFileSize(instance, file);
    if (supportedFileSize && file.size > supportedFileSize) {
      resizeParams = resizeParams ?? {};
      resizeParams.maxBytes = supportedFileSize;
    }
  }

  return resizeParams;
}