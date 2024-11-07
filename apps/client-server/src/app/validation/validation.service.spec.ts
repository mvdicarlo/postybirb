import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WebsitesModule, PostParsersModule, DatabaseModule],
      providers: [
        WebsiteImplProvider,
        ValidationService,
        DatabaseUpdateSubscriber,
        WebsiteRegistryService,
        PostParsersService,
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
