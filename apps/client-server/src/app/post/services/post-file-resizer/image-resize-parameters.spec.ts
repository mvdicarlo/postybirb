import {
    DefaultSubmissionFileMetadata,
    ISubmissionFile,
} from '@postybirb/types';
import { UnknownWebsite } from '../../../websites/website';
import { getImageResizeParameters } from './image-resize-parameters';

describe('getImageResizeParameters', () => {
  it('selects the stricter website dimension pair without mixing sources', () => {
    const websiteResize = {
      width: 700,
      height: 900,
      maxBytes: 1000,
      outputMimeType: 'image/jpeg',
    };
    const instance = {
      accountId: 'account-1',
      calculateImageResize: jest.fn().mockReturnValue(websiteResize),
    } as unknown as UnknownWebsite & {
      calculateImageResize: jest.Mock;
    };
    const file = {
      fileName: 'image.png',
      mimeType: 'image/png',
      size: 2000,
      width: 1200,
      height: 1000,
      metadata: {
        ...DefaultSubmissionFileMetadata(),
        dimensions: {
          default: { width: 400, height: 400 },
          'account-1': { width: 800, height: 600 },
        },
      },
    } as unknown as ISubmissionFile;

    expect(getImageResizeParameters(instance, file)).toEqual({
      width: 700,
      height: 900,
      maxBytes: 1000,
      outputMimeType: 'image/jpeg',
    });
    expect(websiteResize).toEqual({
      width: 700,
      height: 900,
      maxBytes: 1000,
      outputMimeType: 'image/jpeg',
    });
  });

  it('selects the stricter user dimension pair without mixing sources', () => {
    const instance = {
      accountId: 'account-1',
      decoratedProps: {},
      calculateImageResize: jest.fn().mockReturnValue({
        width: 900,
        height: 700,
        outputMimeType: 'image/jpeg',
      }),
    } as unknown as UnknownWebsite & {
      calculateImageResize: jest.Mock;
    };
    const file = {
      fileName: 'image.png',
      mimeType: 'image/png',
      size: 2000,
      width: 1200,
      height: 1000,
      metadata: {
        ...DefaultSubmissionFileMetadata(),
        dimensions: {
          'account-1': { width: 500, height: 800 },
        },
      },
    } as unknown as ISubmissionFile;

    expect(getImageResizeParameters(instance, file)).toEqual({
      width: 500,
      height: 800,
      outputMimeType: 'image/jpeg',
    });
  });

  it('uses user dimensions when the website has no resize calculator', () => {
    const instance = {
      accountId: 'account-1',
      decoratedProps: {},
    } as UnknownWebsite;
    const file = {
      fileName: 'image.png',
      mimeType: 'image/png',
      size: 2000,
      width: 1200,
      height: 1000,
      metadata: {
        ...DefaultSubmissionFileMetadata(),
        dimensions: {
          'account-1': { width: 800, height: 600 },
        },
      },
    } as unknown as ISubmissionFile;

    expect(getImageResizeParameters(instance, file)).toEqual({
      width: 800,
      height: 600,
    });
  });
});