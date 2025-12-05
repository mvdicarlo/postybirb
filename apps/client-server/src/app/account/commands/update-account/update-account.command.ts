import { ICommand } from '@nestjs/cqrs';
import { UpdateAccountDto } from '../../dtos/update-account.dto';

export class UpdateAccountCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly updateAccountDto: UpdateAccountDto,
  ) {}
}
