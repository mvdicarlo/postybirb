import {
  Body,
  Controller,
  Delete,
  Get,
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
    return this.service.findAll();
  }

  @Post()
  @ApiOkResponse({ description: 'Tag group created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createAccountDto: CreateTagGroupDto) {
    return this.service.create(createAccountDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Tag group updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Tag group not found.' })
  update(@Body() updateTagGroupDto: UpdateTagGroupDto) {
    return this.service.update(updateTagGroupDto);
  }

  @Delete()
  @ApiOkResponse({
    description: 'Tag groups deleted successfully.',
    type: Boolean,
  })
  async remove(@Query() query: DeleteQuery) {
    // eslint-disable-next-line no-param-reassign
    query.action = 'HARD_DELETE';
    return DeleteQuery.execute(query, this.service);
  }
}
