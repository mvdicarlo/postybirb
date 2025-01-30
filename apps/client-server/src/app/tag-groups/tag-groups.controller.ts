import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';
import { TagGroupsService } from './tag-groups.service';

/**
 * CRUD operations for TagGroups.
 * @class TagGroupsController
 */
@ApiTags('tag-groups')
@Controller('tag-groups')
export class TagGroupsController extends PostyBirbController<'TagGroupSchema'> {
  constructor(readonly service: TagGroupsService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Tag group created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateTagGroupDto) {
    return this.service.create(createDto).then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tag group updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Tag group not found.' })
  update(@Param('id') id: EntityId, @Body() updateDto: UpdateTagGroupDto) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
  }
}
