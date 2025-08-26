import { Injectable, Optional } from '@nestjs/common';
import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import { Description, DescriptionValue, EntityId } from '@postybirb/types';
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

    return this.repository.update(id, updateCustomShortcutDto);
  }

  public async remove(id: EntityId): Promise<void> {
    const existing = await this.repository.findById(id, {
      failOnMissing: true,
    });
    await super.remove(id);

    const websiteOptions = await this.websiteOptionsService.findAll();
    for (const option of websiteOptions) {
      const { data } = option;
      const descValue: DescriptionValue | undefined = data?.description;
      const blocks: Description | undefined = descValue?.description;

      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        continue;
      }

      const { changed, filtered } = this.filterCustomShortcut(
        blocks,
        String(id),
      );
      if (changed) {
        const updatedDescription: DescriptionValue = {
          ...(descValue as DescriptionValue),
          description: filtered,
        };

        await this.websiteOptionsService.update(option.id, {
          data: {
            ...data,
            description: updatedDescription,
          },
        });
      }
    }
  }

  /**
   * Removes inline customShortcut items matching the given id from a Description document.
   * Simple recursive filter without whitespace normalization.
   */
  private filterCustomShortcut(
    blocks: Description,
    deleteId: string,
  ): {
    changed: boolean;
    filtered: Description;
  } {
    let changed = false;

    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    const filterInline = (content: unknown[]): unknown[] => {
      const out: unknown[] = [];
      for (const node of content) {
        if (!isObject(node)) {
          out.push(node);
          continue;
        }

        const { type, props, content: nodeContent } = node as {
          type?: string;
          props?: Record<string, unknown>;
          content?: unknown[];
        };

        if (type === 'customShortcut' && String((props?.id ?? '')) === deleteId) {
          changed = true;
          continue; // drop this inline
        }

        // Recurse if this inline node has its own content
        if (Array.isArray(nodeContent)) {
          const clone = { ...node } as Record<string, unknown> & {
            content?: unknown[];
          };
          clone.content = filterInline(nodeContent);
          out.push(clone);
        } else {
          out.push(node);
        }
      }
      return out;
    };

    const filterBlocks = (arr: Description): Description =>
      arr.map((blk) => {
        const clone: typeof blk = { ...blk } as typeof blk & {
          content?: unknown[];
          children?: unknown;
        };
        if (Array.isArray(clone.content)) {
          (clone as unknown as { content: unknown[] }).content = filterInline(
            clone.content,
          );
        }
        if (Array.isArray(clone.children)) {
          (clone as unknown as { children: Description }).children = filterBlocks(
            clone.children as unknown as Description,
          );
        }
        return clone;
      });

    const filtered = filterBlocks(blocks);
    return { changed, filtered };
  }
}
