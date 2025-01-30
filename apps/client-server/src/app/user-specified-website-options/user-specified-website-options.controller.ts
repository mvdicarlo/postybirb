import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CreateUserSpecifiedWebsiteOptionsDto } from './dtos/create-user-specified-website-options.dto';
import { UpdateUserSpecifiedWebsiteOptionsDto } from './dtos/update-user-specified-website-options.dto';
import { UserSpecifiedWebsiteOptionsService } from './user-specified-website-options.service';

/**
 * CRUD operations for UserSpecifiedWebsiteOptions
 * @class UserSpecifiedWebsiteOptionsController
 */
@ApiTags('user-specified-website-options')
@Controller('user-specified-website-options')
export class UserSpecifiedWebsiteOptionsController extends PostyBirbController<'UserSpecifiedWebsiteOptionsSchema'> {
  constructor(readonly service: UserSpecifiedWebsiteOptionsService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Entity created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  async create(@Body() createDto: CreateUserSpecifiedWebsiteOptionsDto) {
    if (await this.service.findById(createDto.accountId)) {
      return this.update(createDto.accountId, {
        type: createDto.type,
        options: createDto.options,
      });
    }
    return this.service.create(createDto).then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Entity updated.', type: Boolean })
  @ApiNotFoundResponse()
  update(
    @Param('id') id: EntityId,
    @Body() updateDto: UpdateUserSpecifiedWebsiteOptionsDto,
  ) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
  }
}
