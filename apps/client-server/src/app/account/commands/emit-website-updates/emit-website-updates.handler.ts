import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { EmitWebsiteUpdatesCommand } from './emit-website-updates.command';

@CommandHandler(EmitWebsiteUpdatesCommand)
export class EmitWebsiteUpdatesHandler
  implements ICommandHandler<EmitWebsiteUpdatesCommand>
{
  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(): Promise<void> {
    await this.websiteRegistry.emit();
  }
}
