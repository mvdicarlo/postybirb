import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { WebsiteData } from '../database/entities';
import { SafeObject } from '../shared/types/safe-object';

/**
 * Simple WebsiteData service (for testing)
 */
@Injectable()
export class WebsiteDataService {
  private readonly logger = Logger(WebsiteDataService.name);

  constructor(
    @InjectRepository(WebsiteData)
    private readonly websiteDataRepository: EntityRepository<
      WebsiteData<SafeObject>
    >
  ) {}

  async findOne(id: string) {
    try {
      return await this.websiteDataRepository.findOneOrFail({ id });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  getRepository() {
    return this.websiteDataRepository;
  }
}
