import { Injectable } from '@nestjs/common';
import { AccountId, EntityId, SubmissionType } from '@postybirb/types';
import { and, eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { UserSpecifiedWebsiteOptions } from '../drizzle/models';
import { CreateUserSpecifiedWebsiteOptionsDto } from './dtos/create-user-specified-website-options.dto';
import { UpdateUserSpecifiedWebsiteOptionsDto } from './dtos/update-user-specified-website-options.dto';

@Injectable()
export class UserSpecifiedWebsiteOptionsService extends PostyBirbService<'UserSpecifiedWebsiteOptionsSchema'> {
  constructor() {
    super('UserSpecifiedWebsiteOptionsSchema');
  }

  async create(
    createDto: CreateUserSpecifiedWebsiteOptionsDto,
  ): Promise<UserSpecifiedWebsiteOptions> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating UserSpecifiedWebsiteOptions '${createDto.accountId}'`);
    await this.throwIfExists(
      and(
        eq(this.schema.accountId, createDto.accountId),
        eq(this.schema.type, createDto.type),
      ),
    );
    return this.repository.insert({
      accountId: createDto.accountId,
      ...createDto,
    });
  }

  update(id: EntityId, update: UpdateUserSpecifiedWebsiteOptionsDto) {
    this.logger
      .withMetadata(update)
      .info(`Updating UserSpecifiedWebsiteOptions '${id}'`);
    return this.repository.update(id, { options: update.options });
  }

  public findByAccountAndSubmissionType(
    accountId: AccountId,
    type: SubmissionType,
  ) {
    return this.repository.findOne({
      // eslint-disable-next-line @typescript-eslint/no-shadow
      where: (options, { and, eq }) =>
        and(eq(options.accountId, accountId), eq(options.type, type)),
    });
  }
}
