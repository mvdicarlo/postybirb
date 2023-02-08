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
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';
import { TagConvertersService } from './tag-converters.service';

/**
 * CRUID operations on TagConverters
 * @class TagConvertersController
 */
@ApiTags('tag-converters')
@Controller('tag-converters')
export class TagConvertersController {
  constructor(private readonly service: TagConvertersService) {}

  @Get()
  @ApiOkResponse({ description: 'A list of all tag converter records.' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOkResponse({ description: 'Tag converter created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createTagConverterDto: CreateTagConverterDto) {
    return this.service.create(createTagConverterDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Tag converter updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Tag converter not found.' })
  update(@Body() updateAccountDto: UpdateTagConverterDto) {
    return this.service.update(updateAccountDto);
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
