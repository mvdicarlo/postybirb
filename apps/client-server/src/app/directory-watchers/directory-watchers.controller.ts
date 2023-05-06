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
import { DirectoryWatchersService } from './directory-watchers.service';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

/**
 * CRUD operations on DirectoryWatchers.
 * @class DirectoryWatchersController
 */
@ApiTags('directory-watchers')
@Controller('directory-watchers')
export class DirectoryWatchersController {
  constructor(private readonly service: DirectoryWatchersService) {}

  @Get()
  @ApiOkResponse({ description: 'A list of all entites.' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOkResponse({ description: 'Entity created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateDirectoryWatcherDto) {
    return this.service.create(createDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Entity updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Entity not found.' })
  update(@Body() updateDto: UpdateDirectoryWatcherDto) {
    return this.service.update(updateDto);
  }

  @Delete()
  @ApiOkResponse({
    description: 'Entity deleted.',
    type: Boolean,
  })
  async remove(@Query() query: DeleteQuery) {
    return Promise.all(
      query.getIds().map((id) => this.service.remove(id))
    ).then(() => ({
      success: true,
    }));
  }
}
