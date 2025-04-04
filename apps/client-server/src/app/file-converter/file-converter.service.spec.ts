import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { FileConverterService } from './file-converter.service';

describe('FileConverterService', () => {
  let service: FileConverterService;

  beforeEach(async () => {
    clearDatabase();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileConverterService],
    }).compile();

    service = module.get<FileConverterService>(FileConverterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
