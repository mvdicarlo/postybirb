import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CustomShortcutsService } from './custom-shortcuts.service';
import { CreateCustomShortcutDto } from './dtos/create-custom-shortcut.dto';
import { UpdateCustomShortcutDto } from './dtos/update-custom-shortcut.dto';

@ApiTags('custom-shortcut')
@Controller('custom-shortcut')
export class CustomShortcutsController extends PostyBirbController<'CustomShortcutSchema'> {
  constructor(readonly service: CustomShortcutsService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Custom shortcut created' })
  async create(@Body() createCustomShortcutDto: CreateCustomShortcutDto) {
    return this.service
      .create(createCustomShortcutDto)
      .then((shortcut) => shortcut.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Custom shortcut updated' })
  async update(
    @Body() updateCustomShortcutDto: UpdateCustomShortcutDto,
    @Param('id') id: string,
  ) {
    return this.service
      .update(id, updateCustomShortcutDto)
      .then((shortcut) => shortcut.toDTO());
  }
}
