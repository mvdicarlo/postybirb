import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AccountId, SubmissionType } from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';
import { UserSpecifiedWebsiteOptions } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { CreateUserSpecifiedWebsiteOptionsDto } from './dtos/create-user-specified-website-options.dto';
import { UpdateUserSpecifiedWebsiteOptionsDto } from './dtos/update-user-specified-website-options.dto';

@Injectable()
export class UserSpecifiedWebsiteOptionsService extends PostyBirbService<UserSpecifiedWebsiteOptions> {
  constructor(
    @InjectRepository(UserSpecifiedWebsiteOptions)
    repository: PostyBirbRepository<UserSpecifiedWebsiteOptions>
  ) {
    super(repository);
  }

  async create(
    createDto: CreateUserSpecifiedWebsiteOptionsDto
  ): Promise<UserSpecifiedWebsiteOptions> {
    this.logger.info(
      createDto,
      `Creating UserSpecifiedWebsiteOptions '${createDto.account}'`
    );
    await this.throwIfExists({
      account: createDto.account,
      type: createDto.type,
    });
    const entity = this.repository.create({
      id: createDto.account,
      ...createDto,
    });
    await this.repository.persistAndFlush(entity);
    return entity;
  }

  update(id: string, update: UpdateUserSpecifiedWebsiteOptionsDto) {
    this.logger.info(update, `Updating UserSpecifiedWebsiteOptions '${id}'`);
    // TODO check this actually updates subfields
    return this.repository.update(id, update);
  }

  public findByAccountAndSubmissionType(
    accountId: AccountId,
    type: SubmissionType
  ) {
    return this.repository.findOne({ account: accountId, type });
  }
}
