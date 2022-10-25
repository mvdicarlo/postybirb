import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { Constructor } from 'type-fest';
import { OnDatabaseUpdate } from '../common/service/modifiers/on-database-update';
import { PostyBirbCRUDService } from '../common/service/postybirb-crud-service';
import { Account, Settings } from '../database/entities';
import { BaseEntity } from '../database/entities/base.entity';
import { EntityUpdateRecord } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsConstants } from './settings.constants';

@Injectable()
export class SettingsService
  extends PostyBirbCRUDService<Settings>
  implements OnModuleInit, OnDatabaseUpdate
{
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    moduleRef: ModuleRef,
    @InjectRepository(Settings)
    repository: EntityRepository<Settings>,
    @Optional() webSocket: WSGateway
  ) {
    super(moduleRef, repository, webSocket);
  }

  /**
   * Initializes default settings if required.
   */
  async onModuleInit() {
    if (
      !(await this.repository.count({
        profile: SettingsConstants.DEFAULT_PROFILE_NAME,
      }))
    ) {
      this.createDefaultAccount();
    }
  }

  getRegisteredEntities(): Constructor<BaseEntity>[] {
    return [Settings];
  }

  async onDatabaseUpdate() {
    this.emit();
  }

  // Not sure if we'll ever need this
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createDto: unknown): Promise<Settings> {
    throw new Error('Method not implemented.');
  }

  /**
   * Creates the default settings record.
   */
  private createDefaultAccount() {
    const entity = this.repository.create({
      profile: SettingsConstants.DEFAULT_PROFILE_NAME,
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });

    this.repository
      .persistAndFlush(entity)
      .then(() => {
        this.logger.debug(entity, 'Default settings created');
      })
      .catch((err) => {
        this.logger.error(err, 'Unablet to create default settings');
      });
  }

  /**
   * Emits settings.
   */
  async emit() {
    super.emit({
      event: SETTINGS_UPDATES,
      data: await this.findAll(),
    });
  }

  /**
   * Updates a settings profile.
   *
   * @param {UpdateSettingsDto} updateSettingsDto
   */
  async update(updateSettingsDto: UpdateSettingsDto): Promise<boolean> {
    const settingObj = await this.findOne(updateSettingsDto.id);
    settingObj.settings = updateSettingsDto.settings;
    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}
