import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { TagConverter } from '../database/entities';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';
import { TagConvertersService } from './tag-converters.service';

/**
 * CRUID operations on TagConverters
 * @class TagConvertersController
 */
@ApiTags('tag-converters')
@Controller('tag-converters')
export class TagConvertersController extends PostyBirbController<TagConverter> {
  constructor(readonly service: TagConvertersService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Tag converter created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createTagConverterDto: CreateTagConverterDto) {
    return this.service
      .create(createTagConverterDto)
      .then((entity) => entity.toJSON());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tag converter updated.' })
  @ApiNotFoundResponse({ description: 'Tag converter not found.' })
  update(@Body() updateDto: UpdateTagConverterDto, @Param('id') id: string) {
    return this.service.update(id, updateDto).then((entity) => entity.toJSON());
  }
}
