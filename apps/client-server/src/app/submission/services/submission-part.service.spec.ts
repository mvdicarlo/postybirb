import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionPartService } from './submission-part.service';

describe('SubmissionPartService', () => {
  let service: SubmissionPartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubmissionPartService],
    }).compile();

    service = module.get<SubmissionPartService>(SubmissionPartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
