import type { ISubmissionFileDto } from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';
import { getThumbnailUrl } from './utils';

jest.mock('../../../../transports/http-client', () => ({
  getBaseUrl: () => 'https://example.com',
}));

function submission(primaryFile?: Partial<ISubmissionFileDto>) {
  return { primaryFile } as SubmissionRecord;
}

describe('submission card thumbnails', () => {
  it('uses the thumbnail endpoint for generated thumbnails', () => {
    expect(
      getThumbnailUrl(
        submission({
          id: 'image-1',
          hash: 'image-hash',
          mimeType: 'image/png',
          hasThumbnail: true,
          hasCustomThumbnail: false,
        }),
      ),
    ).toBe('https://example.com/api/file/thumbnail/image-1?image-hash');
  });

  it('requests a thumbnail rather than the original for images missing thumbnails', () => {
    expect(
      getThumbnailUrl(
        submission({
          id: 'image-1',
          hash: 'image-hash',
          mimeType: 'image/png',
          hasThumbnail: false,
        }),
      ),
    ).toBe('https://example.com/api/file/thumbnail/image-1?image-hash');
  });

  it('uses custom thumbnails for non-image files', () => {
    expect(
      getThumbnailUrl(
        submission({
          id: 'video-1',
          hash: 'video-hash',
          mimeType: 'video/mp4',
          hasThumbnail: true,
          hasCustomThumbnail: true,
        }),
      ),
    ).toBe('https://example.com/api/file/thumbnail/video-1?video-hash');
  });

  it('keeps a placeholder for non-image files without thumbnails', () => {
    expect(
      getThumbnailUrl(
        submission({ mimeType: 'application/pdf', hasThumbnail: false }),
      ),
    ).toBeUndefined();
  });

  it('keeps a placeholder when there is no primary file', () => {
    expect(getThumbnailUrl(submission())).toBeUndefined();
  });
});