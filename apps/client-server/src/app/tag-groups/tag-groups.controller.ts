import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteQuery } from '../common/service/modifiers/delete-query';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';
import { TagGroupsService } from './tag-groups.service';

/**
 * CRUD operations on TagGroups.
 * @class TagGroupsController
 */
@ApiTags('tag-groups')
@Controller('tag-groups')
export class TagGroupsController {
  constructor(private readonly service: TagGroupsService) {}

  @Get()
  @ApiOkResponse({ description: 'A list of all tag group records.' })
  findAll() {
    return this.service
      .findAll()
      .then((entities) => entities.map((entity) => entity.toJson()));
  }

  @Post()
  @ApiOkResponse({ description: 'Tag group created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateTagGroupDto) {
    return this.service.create(createDto).then((entity) => entity.toJson());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tag group updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Tag group not found.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTagGroupDto) {
    return this.service.update(id, updateDto).then((entity) => entity.toJson());
  }

  @Delete()
  @ApiOkResponse({
    description: 'Tag groups deleted successfully.',
  })
  async remove(@Query() query: DeleteQuery) {
    return Promise.all(
      query.getIds().map((id) => this.service.remove(id))
    ).then(() => ({
      success: true,
    }));
  }
}
