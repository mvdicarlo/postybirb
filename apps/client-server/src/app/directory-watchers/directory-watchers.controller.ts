import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { DirectoryWatchersService } from './directory-watchers.service';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

/**
 * CRUD operations on DirectoryWatchers.
 * @class DirectoryWatchersController
 */
@ApiTags('directory-watchers')
@Controller('directory-watchers')
export class DirectoryWatchersController extends PostyBirbController<'directoryWatcher'> {
  constructor(readonly service: DirectoryWatchersService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Entity created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateDirectoryWatcherDto) {
    return this.service.create(createDto).then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Entity updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Entity not found.' })
  update(
    @Body() updateDto: UpdateDirectoryWatcherDto,
    @Param('id') id: string,
  ) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
  }
}
