import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomShortcut, CustomShortcutRepository } from '@postybirb/database';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { CUSTOM_SHORTCUT_EVENT_PREFIX } from './custom-shortcut.events';
import { CreateCustomShortcutDto } from './dtos/create-custom-shortcut.dto';
import { UpdateCustomShortcutDto } from './dtos/update-custom-shortcut.dto';

@Injectable()
export class CustomShortcutsService extends PostyBirbService<CustomShortcutRepository> {
  constructor(@Optional() eventEmitter?: EventEmitter2) {
    super(new CustomShortcutRepository());
    this.configureCrudEvents(CUSTOM_SHORTCUT_EVENT_PREFIX, eventEmitter);
  }

  public async create(
    createCustomShortcutDto: CreateCustomShortcutDto,
  ): Promise<CustomShortcut> {
    this.logger
      .withMetadata(createCustomShortcutDto)
      .info('Creating custom shortcut');
    await this.throwIfExists(
      eq(this.table.name, createCustomShortcutDto.name),
    );
    const entity = await this.repository.insert(createCustomShortcutDto);
    this.publishCreated(entity.toDTO());
    return entity;
  }

  public async update(
    id: string,
    updateCustomShortcutDto: UpdateCustomShortcutDto,
  ): Promise<CustomShortcut> {
    this.logger
      .withMetadata(updateCustomShortcutDto)
      .info('Updating custom shortcut');
    await this.repository.findByIdOrThrow(id);
    const entity = await this.repository.update(id, updateCustomShortcutDto);
    this.publishUpdated(entity.toDTO());
    return entity;
  }

  public override async remove(id: EntityId): Promise<void> {
    await this.repository.findByIdOrThrow(id);
    await super.remove(id);
  }
}
