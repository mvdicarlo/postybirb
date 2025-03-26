import { Test, TestingModule } from '@nestjs/testing';
import { ISubmission, ISubmissionFile } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageUtil } from '../../../file/utils/image.util';
import { PostFileResizerService } from './post-file-resizer.service';

describe('PostFileResizerService', () => {
  let service: PostFileResizerService;
  let module: TestingModule;
  let testFile: Buffer;
  let file: ISubmissionFile;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [PostFileResizerService],
    }).compile();

    service = module.get<PostFileResizerService>(PostFileResizerService);
  });

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
      size: testFile.length,
      hasThumbnail: false,
      hasCustomThumbnail: false,
      hasAltFile: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submission: {} as ISubmission<never>,
      width,
      height,
      primaryFileId: 'test',
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

  beforeAll(() => {
    testFile = readFileSync(
      join(__dirname, '../../../../test-files/small_image.jpg'),
    );
    file = createFile('test.jpg', 'image/jpeg', 202, 138, testFile);
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
    const metadata = await ImageUtil.load(resized.buffer).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBeLessThan(202);
    expect(resized.fileName).toBe('test.jpeg');
    expect(resized.thumbnail).toBeDefined();
  });

  it('should not resize image', async () => {
    const resized = await service.resize({ file, resize: { width: 300 } });
    expect(resized.buffer.length).toBe(testFile.length);
    const metadata = await ImageUtil.load(resized.buffer).metadata();
    expect(metadata.width).toBe(file.width);
    expect(metadata.height).toBe(file.height);
    expect(resized.fileName).toBe('test.jpg');
  });

  it('should scale down image', async () => {
    const resized = await service.resize({
      file,
      resize: { maxBytes: testFile.length - 1000 },
    });
    expect(resized.buffer.length).toBeLessThan(testFile.length);
    expect(resized.thumbnail?.buffer.length).toBeLessThan(testFile.length);
    expect(resized.fileName).toBe('test.jpeg');
    expect(resized.thumbnail?.fileName).toBe('test.jpeg');
    expect(resized.mimeType).toBe('image/jpeg');
  });

  it('should fail to scale down image', async () => {
    await expect(
      service.resize({
        file,
        resize: { maxBytes: -1 },
      }),
    ).rejects.toThrow();
  });

  it('should convert png thumbnail without alpha to jpeg', async () => {
    const noAlphaFile = readFileSync(
      join(__dirname, '../../../../test-files/png_no_alpha.png'),
    );
    const tf = createFile('test.png', 'image/png', 600, 600, noAlphaFile);
    const resized = await service.resize({
      file: tf,
      resize: { maxBytes: noAlphaFile.length - 1000 },
    });

    expect(resized.buffer.length).toBeLessThan(noAlphaFile.length);
    expect(resized.fileName).toBe('test.png');
    expect(resized.thumbnail?.buffer.length).toBeLessThan(noAlphaFile.length);
    expect(resized.thumbnail?.fileName).toBe('test.jpeg');
  });

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
  });
});
