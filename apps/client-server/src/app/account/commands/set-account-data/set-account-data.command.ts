import { ICommand } from '@nestjs/cqrs';
import { SetWebsiteDataRequestDto } from '../../dtos/set-website-data-request.dto';

export class SetAccountDataCommand implements ICommand {
  constructor(public readonly dto: SetWebsiteDataRequestDto) {}
}
