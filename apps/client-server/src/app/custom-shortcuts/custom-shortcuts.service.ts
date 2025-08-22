import { Injectable, Optional } from '@nestjs/common';
import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { CustomShortcut } from '../drizzle/models/custom-shortcut.entity';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { CreateCustomShortcutDto } from './dtos/create-custom-shortcut.dto';
import { UpdateCustomShortcutDto } from './dtos/update-custom-shortcut.dto';

@Injectable()
export class CustomShortcutsService extends PostyBirbService<'CustomShortcutSchema'> {
  constructor(
    private readonly websiteOptionsService: WebsiteOptionsService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('CustomShortcutSchema', webSocket);
    this.repository.subscribe('CustomShortcutSchema', () => this.emit());
  }

  public async emit() {
    const dtos = await this.findAll();
    super.emit({
      event: CUSTOM_SHORTCUT_UPDATES,
      data: dtos.map((dto) => dto.toDTO()),
    });
  }

  public async create(
    createCustomShortcutDto: CreateCustomShortcutDto,
  ): Promise<CustomShortcut> {
    this.logger
      .withMetadata(createCustomShortcutDto)
      .info('Creating custom shortcut');
    await this.throwIfExists(
      eq(this.schema.name, createCustomShortcutDto.name),
    );
    return this.repository.insert(createCustomShortcutDto);
  }

  public async update(
    id: string,
    updateCustomShortcutDto: UpdateCustomShortcutDto,
  ): Promise<CustomShortcut> {
    this.logger
      .withMetadata(updateCustomShortcutDto)
      .info('Updating custom shortcut');
    const existing = await this.repository.findById(id, {
      failOnMissing: true,
    });

    const nameChanged = existing.name !== updateCustomShortcutDto.name;
    if (nameChanged) {
      await this.throwIfExists(
        eq(this.schema.name, updateCustomShortcutDto.name),
      );
    }

    const updated = await this.repository.update(id, updateCustomShortcutDto);

    if (nameChanged) {
      // TODO - go through all website options, get their descriptions, and update any custom shortcut matching updated
    }

    return updated;
  }

  public async remove(id: EntityId): Promise<void> {
    const existing = await this.repository.findById(id, {
      failOnMissing: true,
    });
    await super.remove(id);

    // TODO - go through all website options, get their descriptions, and remove any custom shortcut matching remoed
  }
}
