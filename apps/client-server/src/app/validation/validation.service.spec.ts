import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { FileConverterService } from '../file-converter/file-converter.service';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    clearDatabase();
    const module: TestingModule = await Test.createTestingModule({
      imports: [WebsitesModule, PostParsersModule],
      providers: [
        WebsiteImplProvider,
        ValidationService,
        WebsiteRegistryService,
        PostParsersService,
        FileConverterService,
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
