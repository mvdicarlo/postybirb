import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { SubmissionTemplate } from '../database/entities/submission-template.entity';
import { CreateSubmissionTemplateDto } from './dtos/create-submission-template.dto';
import { UpdateSubmissionTemplateDto } from './dtos/update-submission-template.dto';
import { SubmissionTemplatesService } from './submission-templates.service';

/**
 * CRUD operations for SubmissionTemplates.
 * @class SubmissionTemplatesController
 */
@ApiTags('submission-templates')
@Controller('submission-templates')
export class SubmissionTemplatesController extends PostyBirbController<SubmissionTemplate> {
  constructor(readonly service: SubmissionTemplatesService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Entity created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateSubmissionTemplateDto) {
    return this.service.create(createDto).then((entity) => entity.toJSON());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Entity updated.' })
  @ApiNotFoundResponse({ description: 'Entity not found.' })
  update(
    @Body() updateDto: UpdateSubmissionTemplateDto,
    @Param('id') id: string
  ) {
    return this.service.update(id, updateDto).then((entity) => entity.toJSON());
  }
}
