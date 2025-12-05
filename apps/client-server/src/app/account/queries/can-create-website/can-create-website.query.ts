import { IQuery } from '@nestjs/cqrs';

export class CanCreateWebsiteQuery implements IQuery {
  constructor(public readonly websiteName: string) {}
}
