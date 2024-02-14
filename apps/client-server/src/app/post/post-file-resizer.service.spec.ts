import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ISubmission, ISubmissionFile } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseModule } from '../database/database.module';
import { ImageUtil } from '../file/utils/image.util';
import { PostFileResizerService } from './post-file-resizer.service';

describe('PostFileResizerService', () => {
  let service: PostFileResizerService;
  let module: TestingModule;
  let orm: MikroORM;
  let testFile: Buffer;
  let file: ISubmissionFile;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [PostFileResizerService],
    }).compile();

    service = module.get<PostFileResizerService>(PostFileResizerService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
  });

  beforeAll(() => {
    testFile = readFileSync(join(__dirname, '../test-files/powerbear.jpg'));
    file = {
      id: 'a',
      fileName: 'test.jpg',
      hash: 'test',
      mimeType: 'image/jpeg',
      size: testFile.length,
      hasThumbnail: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      submission: {} as ISubmission<never>,
      width: 138,
      height: 202,
      props: {
        hasCustomThumbnail: false,
        width: 138,
        height: 202,
      },
      file: {
        parent: {} as ISubmissionFile,
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        id: 'test',
        buffer: testFile,
        size: testFile.length,
        width: 138,
        height: 202,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  });

  afterAll(async () => {
    await orm.close(true);
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
    expect(resized.fileName).toBe('a.jpg');
  });

  it('should not resize image', async () => {
    const resized = await service.resize({ file, resize: { width: 300 } });
    expect(resized.buffer.length).toBe(testFile.length);
    const metadata = await ImageUtil.load(resized.buffer).metadata();
    expect(metadata.width).toBe(file.width);
    expect(metadata.height).toBe(file.height);
    expect(resized.fileName).toBe('a.jpg');
  });

  it('should scale down image', async () => {
    const resized = await service.resize({
      file,
      resize: { maxBytes: testFile.length - 1000 },
    });
    expect(resized.buffer.length).toBeLessThan(testFile.length);
  });

  it('should fail to scale down image', async () => {
    await expect(
      service.resize({
        file,
        resize: { maxBytes: -1 },
      })
    ).rejects.toThrow();
  });
});
