import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CanCreateWebsiteQuery } from './can-create-website.query';

@QueryHandler(CanCreateWebsiteQuery)
export class CanCreateWebsiteHandler
  implements IQueryHandler<CanCreateWebsiteQuery>
{
  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(query: CanCreateWebsiteQuery): Promise<boolean> {
    return this.websiteRegistry.canCreate(query.websiteName);
  }
}
