import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { RemoveWebsiteInstanceCommand } from './remove-website-instance.command';

@CommandHandler(RemoveWebsiteInstanceCommand)
export class RemoveWebsiteInstanceHandler
  implements ICommandHandler<RemoveWebsiteInstanceCommand>
{
  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(command: RemoveWebsiteInstanceCommand): Promise<void> {
    await this.websiteRegistry.remove(command.account);
  }
}
