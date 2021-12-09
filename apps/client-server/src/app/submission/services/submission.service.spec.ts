import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let service: SubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubmissionService],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
