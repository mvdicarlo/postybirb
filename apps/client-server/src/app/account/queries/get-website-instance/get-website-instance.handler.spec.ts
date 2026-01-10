import { Test, TestingModule } from '@nestjs/testing';
import { Account } from '../../../drizzle/models';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { GetWebsiteInstanceHandler } from './get-website-instance.handler';
import { GetWebsiteInstanceQuery } from './get-website-instance.query';

describe('GetWebsiteInstanceHandler', () => {
  let handler: GetWebsiteInstanceHandler;
  let websiteRegistry: WebsiteRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetWebsiteInstanceHandler,
        {
          provide: WebsiteRegistryService,
          useValue: {
            findInstance: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetWebsiteInstanceHandler>(GetWebsiteInstanceHandler);
    websiteRegistry = module.get<WebsiteRegistryService>(
      WebsiteRegistryService,
    );
  });

  it('should return website instance', async () => {
    const account = new Account({ id: 'test-id' });
    const websiteInstance = { id: 'test-website' };
    (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
      websiteInstance,
    );

    const result = await handler.execute(new GetWebsiteInstanceQuery(account));

    expect(websiteRegistry.findInstance).toHaveBeenCalledWith(account);
    expect(result).toBe(websiteInstance);
  });
});
