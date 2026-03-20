import { Test, TestingModule } from '@nestjs/testing';
import {
  DefaultSubmissionFileMetadata,
  ISubmission,
  ISubmissionFile,
} from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SharpInstanceManager } from '../../../image-processing/sharp-instance-manager';
import { PostFileResizerService } from './post-file-resizer.service';

describe('PostFileResizerService', () => {
  let service: PostFileResizerService;
  let sharpManager: SharpInstanceManager;
  let module: TestingModule;
  let testFile: Buffer;
  let file: ISubmissionFile;

  function createFile(
    fileName: string,
    mimeType: string,
    height: number,
    width: number,
    buf: Buffer,
  ): ISubmissionFile {
    return {
      id: 'test',
      fileName,
      hash: 'test',
      mimeType,
      size: buf.length,
      hasThumbnail: false,
      hasCustomThumbnail: false,
      hasAltFile: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submission: {} as ISubmission<never>,
      width,
      height,
      primaryFileId: 'test',
      submissionId: 'test',
      metadata: DefaultSubmissionFileMetadata(),
      order: 0,
      file: {
        submissionFileId: 'test',
        fileName,
        mimeType,
        id: 'test',
        buffer: buf,
        size: buf.length,
        width,
        height,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  beforeAll(async () => {
    testFile = readFileSync(
      join(__dirname, '../../../../test-files/small_image.jpg'),
    );
    file = createFile('test.jpg', 'image/jpeg', 202, 138, testFile);

    module = await Test.createTestingModule({
      providers: [PostFileResizerService, SharpInstanceManager],
    }).compile();

    service = module.get<PostFileResizerService>(PostFileResizerService);
    sharpManager = module.get<SharpInstanceManager>(SharpInstanceManager);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resize image', async () => {
    const resized = await service.resize({ file, resize: { width: 100 } });
    expect(resized.buffer.length).toBeLessThan(testFile.length);
    const metadata = await sharpManager.getMetadata(resized.buffer);
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBeLessThan(202);
    expect(resized.fileName).toBe('test.jpeg');
    expect(resized.thumbnail).toBeDefined();
  }, 5_000);

  it('should not resize image', async () => {
    const resized = await service.resize({ file, resize: { width: 300 } });
    expect(resized.buffer.length).toBe(testFile.length);
    const metadata = await sharpManager.getMetadata(resized.buffer);
    expect(metadata.width).toBe(file.width);
    expect(metadata.height).toBe(file.height);
    expect(resized.fileName).toBe('test.jpg');
  }, 5_000);

  it('should scale down image', async () => {
    const resized = await service.resize({
      file,
      resize: { maxBytes: testFile.length - 1000 },
    });
    expect(resized.buffer.length).toBeLessThan(testFile.length);
    expect(resized.thumbnail?.buffer.length).toBeLessThan(testFile.length);
    expect(resized.fileName).toBe('test.jpeg');
    expect(resized.thumbnail?.fileName).toBe('test.jpg');
    expect(resized.mimeType).toBe('image/jpeg');
  }, 5_000);

  it('should fail to scale down image', async () => {
    await expect(
      service.resize({
        file,
        resize: { maxBytes: -1 },
      }),
    ).rejects.toThrow();
  }, 5_000);

  it('should not convert png thumbnail with alpha to jpeg', async () => {
    const noAlphaFile = readFileSync(
      join(__dirname, '../../../../test-files/png_with_alpha.png'),
    );
    const tf = createFile('test.png', 'image/png', 600, 600, noAlphaFile);
    const resized = await service.resize({
      file: tf,
      resize: { maxBytes: noAlphaFile.length - 1000 },
    });

    expect(resized.buffer.length).toBeLessThan(noAlphaFile.length);
    expect(resized.fileName).toBe('test.png');
    expect(resized.thumbnail?.buffer.length).toBeLessThan(noAlphaFile.length);
    expect(resized.thumbnail?.fileName).toBe('test.png');
  }, 5_000);
});
