import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseModule } from '../database/database.module';
import { PostFileResizerService } from './post-file-resizer.service';
import { ISubmission, ISubmissionFile } from '@postybirb/types';

describe('PostFileResizerService', () => {
  let service: PostFileResizerService;
  let module: TestingModule;
  let orm: MikroORM;
  let testFile: Buffer;

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
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resize image', async () => {
    const file: ISubmissionFile = {
      id: 'test',
      fileName: 'test.jpg',
      hash: 'test',
      mimeType: 'image/jpeg',
      size: testFile.length,
      hasThumbnail: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      submission: {} as ISubmission<never>,
      width: 202,
      height: 138,
      props: {
        hasCustomThumbnail: false,
        width: 202,
        height: 138,
      },
      file: {
        parent: {} as ISubmissionFile,
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        id: 'test',
        buffer: testFile,
        size: testFile.length,
        width: 202,
        height: 138,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const resized = await service.resize({ file, resize: { width: 100 } });
    expect(resized.buffer.length).toBeLessThan(testFile.length);
  });
});
