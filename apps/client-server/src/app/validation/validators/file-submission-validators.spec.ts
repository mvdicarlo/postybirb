import { FileType, SubmissionType, ValidationResult } from '@postybirb/types';
import { UnknownWebsite } from '../../websites/website';
import {
    validateAcceptedFiles,
    validateFileBatchSize,
} from './file-submission-validators';
import { FieldValidator, ValidatorParams } from './validator.type';

function makeFile(fileName: string, mimeType: string) {
  return {
    id: fileName,
    fileName,
    mimeType,
    size: 100,
    width: 100,
    height: 100,
    metadata: {},
  };
}

function makeParams(options: {
  supportedFileTypes: FileType[];
  acceptedMimeTypes: string[];
  files?: ReturnType<typeof makeFile>[];
  fileBatchSize?: number;
}) {
  const result: ValidationResult = {
    id: 'website-option',
    account: {} as ValidationResult['account'],
    errors: [],
    warnings: [],
  };
  const submission = {
    id: 'submission',
    type: SubmissionType.FILE,
    files: options.files ?? [makeFile('clip.mp4', 'video/mp4')],
  };
  const websiteInstance = {
    accountId: 'account',
    supportsFile: true,
    decoratedProps: {
      fileOptions: {
        supportedFileTypes: options.supportedFileTypes,
        acceptedMimeTypes: options.acceptedMimeTypes,
        fileBatchSize: options.fileBatchSize ?? 1,
      },
    },
  } as unknown as UnknownWebsite;
  const canConvert = jest.fn().mockReturnValue(false);

  return {
    result,
    canConvert,
    params: {
      result,
      validator: new FieldValidator(result.errors, result.warnings),
      websiteInstance,
      submission,
      data: { submission, options: {} },
      fileConverterService: { canConvert },
      fileService: { getAltFileSize: jest.fn() },
      mergedWebsiteOptions: {},
    } as unknown as ValidatorParams,
  };
}

describe('file submission validators', () => {
  it('warns and stops MIME validation for an unsupported broad file type', async () => {
    const { params, result, canConvert } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['image/png'],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([
      expect.objectContaining({
        id: 'validation.file.unsupported-file-type',
        values: expect.objectContaining({ fileName: 'clip.mp4' }),
      }),
    ]);
    expect(result.errors).toEqual([]);
    expect(canConvert).not.toHaveBeenCalled();
  });

  it('keeps an invalid MIME error within a supported broad file type', async () => {
    const { params, result, canConvert } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['image/png'],
      files: [makeFile('picture.webp', 'image/webp')],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({ id: 'validation.file.invalid-mime-type' }),
    ]);
    expect(canConvert).toHaveBeenCalledWith('image/webp', ['image/png']);
  });

  it('uses a recognized MIME type before a conflicting filename extension', async () => {
    const { params, result } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['image/png'],
      files: [makeFile('misleading.mp4', 'image/png')],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('falls back to the filename when the MIME type is unknown', async () => {
    const { params, result } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['application/octet-stream'],
      files: [makeFile('picture.png', 'application/octet-stream')],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('classifies a file as unknown when MIME type and filename are unknown', async () => {
    const { params, result } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['application/octet-stream'],
      files: [makeFile('unknown.bin', 'application/octet-stream')],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([
      expect.objectContaining({
        id: 'validation.file.unsupported-file-type',
        values: expect.objectContaining({ fileType: FileType.UNKNOWN }),
      }),
    ]);
    expect(result.errors).toEqual([]);
  });

  it('does not count unsupported files toward website batch warnings', async () => {
    const { params, result } = makeParams({
      supportedFileTypes: [FileType.IMAGE],
      acceptedMimeTypes: ['image/png'],
      fileBatchSize: 1,
      files: [
        makeFile('picture.png', 'image/png'),
        makeFile('clip.mp4', 'video/mp4'),
      ],
    });

    await validateFileBatchSize(params);

    expect(result.warnings).toEqual([]);
  });

  it('treats an empty supported-type list as accepting every broad type', async () => {
    const { params, result } = makeParams({
      supportedFileTypes: [],
      acceptedMimeTypes: [],
    });

    await validateAcceptedFiles(params);

    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
