import { AccountId, FileMetadataFields, ISubmissionFileDto, ModifiedFileDimension } from '@postybirb/types';

export function updateFileDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  height: number,
  width: number,
) {
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions.default = {
    fileId: file.id,
    height,
    width,
  };
}

export function calculateAspectRatio(
  height: number,
  width: number,
  aspect: number,
  order: 'h' | 'w',
) {
  if (order === 'h') {
    const aspectRatio = aspect; // width / height
    const widthT = Math.ceil(height * aspectRatio);
    const heightT = Math.ceil(height);
    return { width: widthT, height: heightT };
  }

  const aspectRatio = aspect; // height / width
  const heightT = Math.ceil(width * aspectRatio);
  const widthT = Math.ceil(width);
  return { width: widthT, height: heightT };
}

export function updateAccountDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  accountId: AccountId,
  height: number,
  width: number,
) {
  if (!metadata.dimensions) {
    // eslint-disable-next-line no-param-reassign
    metadata.dimensions = {} as any; // fallback
  }
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions[accountId] = {
    fileId: file.id,
    height,
    width,
  };
}

export function removeAccountDimensions(
  metadata: FileMetadataFields,
  accountId: AccountId,
) {
  if (metadata.dimensions) {
    // eslint-disable-next-line no-param-reassign
    delete metadata.dimensions[accountId];
  }
}

export function getAccountDimensions(
  metadata: FileMetadataFields,
  accountId: AccountId,
  file: ISubmissionFileDto,
): ModifiedFileDimension {
  return metadata.dimensions[accountId] ?? metadata.dimensions.default ?? file;
}

export function computeScale(height: number, width: number, originalHeight: number, originalWidth: number) {
  const scale = originalHeight && originalWidth ? Math.min(height / originalHeight, width / originalWidth) : 1;
  return { scale, percent: Math.round(scale * 100) };
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
export function formatAspect(height: number, width: number) {
  if (!height || !width) return '';
  const longerIsWidth = width >= height;
  const major = longerIsWidth ? width : height;
  const minor = longerIsWidth ? height : width;
  const decimal = major / minor;
  // Try to reduce to a small integer ratio first
  const d = gcd(width, height);
  const rw = width / d;
  const rh = height / d;
  const maxComponent = Math.max(rw, rh);
  let display: string;
  if (maxComponent <= 20) {
    display = `${rw}:${rh}`; // classic (e.g. 16:9)
  } else {
    const normalized = decimal.toFixed(decimal < 10 ? 2 : 1).replace(/\.0+$/, '').replace(/(\.[1-9]*)0+$/, '$1');
    display = longerIsWidth ? `${normalized}:1` : `1:${normalized}`;
  }
  return display;
}
export function rawAspect(width: number, height: number) { return `${width}:${height}`; }
