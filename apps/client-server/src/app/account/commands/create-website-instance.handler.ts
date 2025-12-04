import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnknownWebsite } from '../../websites/website';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CreateWebsiteInstanceCommand } from './create-website-instance.command';

@CommandHandler(CreateWebsiteInstanceCommand)
export class CreateWebsiteInstanceHandler
  implements ICommandHandler<CreateWebsiteInstanceCommand>
{
  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(command: CreateWebsiteInstanceCommand): Promise<UnknownWebsite> {
    return this.websiteRegistry.create(command.account);
  }
}
