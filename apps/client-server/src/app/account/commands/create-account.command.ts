import { CreateAccountDto } from '../dtos/create-account.dto';

export class CreateAccountCommand {
  constructor(public readonly createAccountDto: CreateAccountDto) {}
}
