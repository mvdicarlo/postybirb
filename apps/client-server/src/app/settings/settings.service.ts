import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { Settings } from '../database/entities';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsConstants } from './settings.constants';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = Logger(SettingsService.name);

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: EntityRepository<Settings>,
    @Optional() private readonly webSocket: WSGateway
  ) {}

  /**
   * Initializes default settings if required.
   */
  async onModuleInit() {
    if (
      !(await this.settingsRepository.count({
        profile: SettingsConstants.DEFAULT_PROFILE_NAME,
      }))
    ) {
      this.createDefaultAccount();
    }
  }

  /**
   * Creates the default settings record.
   */
  private createDefaultAccount() {
    const entity = this.settingsRepository.create({
      profile: SettingsConstants.DEFAULT_PROFILE_NAME,
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });

    this.settingsRepository
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
  private async emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: SETTINGS_UPDATES,
        data: await this.findAll(),
      });
    }
  }

  /**
   * Returns a list of all Settings profiles.
   * @return {*}  {Promise<Settings[]>}
   */
  async findAll(): Promise<Settings[]> {
    const settings = await this.settingsRepository.find({});
    return settings;
  }

  /**
   * Finds a settings profile matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<Settings>}
   */
  async findOne(id: string): Promise<Settings> {
    try {
      const settings = await this.settingsRepository.findOneOrFail(id);
      return settings;
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Updates a settings profile.
   *
   * @param {UpdateSettingsDto} updateSettingsDto
   */
  async update(updateSettingsDto: UpdateSettingsDto): Promise<boolean> {
    const settingObj = await this.findOne(updateSettingsDto.id);
    settingObj.settings = updateSettingsDto.settings;
    return this.settingsRepository
      .flush()
      .then(() => this.emit())
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}
