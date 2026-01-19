import { ICommand } from '@nestjs/cqrs';

export class ClearAccountDataCommand implements ICommand {
  constructor(public readonly id: string) {}
}
