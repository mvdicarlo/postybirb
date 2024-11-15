import { Test, TestingModule } from '@nestjs/testing';
import { TextFileConverterService } from '../text-file-converter.service';

describe('TextFileConverterService', () => {
  let service: TextFileConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextFileConverterService],
    }).compile();

    service = module.get<TextFileConverterService>(TextFileConverterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
