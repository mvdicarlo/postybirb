import { IQuery } from '@nestjs/cqrs';

export class GetAccountQuery implements IQuery {
  constructor(public readonly id: string) {}
}
