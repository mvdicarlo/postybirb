import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { GetWebsiteInstanceQuery } from './get-website-instance.query';

@QueryHandler(GetWebsiteInstanceQuery)
export class GetWebsiteInstanceHandler
  implements IQueryHandler<GetWebsiteInstanceQuery>
{
  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(query: GetWebsiteInstanceQuery): Promise<UnknownWebsite> {
    const { account } = query;
    return this.websiteRegistry.findInstance(account);
  }
}
