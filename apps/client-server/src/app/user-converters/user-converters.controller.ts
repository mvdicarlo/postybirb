import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CreateUserConverterDto } from './dtos/create-user-converter.dto';
import { UpdateUserConverterDto } from './dtos/update-user-converter.dto';
import { UserConvertersService } from './user-converters.service';

/**
 * CRUD operations on UserConverters
 * @class UserConvertersController
 */
@ApiTags('user-converters')
@Controller('user-converters')
export class UserConvertersController extends PostyBirbController<'UserConverterSchema'> {
  constructor(readonly service: UserConvertersService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'User converter created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createUserConverterDto: CreateUserConverterDto) {
    return this.service
      .create(createUserConverterDto)
      .then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'User converter updated.' })
  @ApiNotFoundResponse({ description: 'User converter not found.' })
  update(@Body() updateDto: UpdateUserConverterDto, @Param('id') id: EntityId) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
  }
}
