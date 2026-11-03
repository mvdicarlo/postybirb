import {
  CreateWebsiteOptionsDto,
  EntityId,
  PreviewDescriptionDto,
  SubmissionId,
  UpdateSubmissionWebsiteOptionsDto,
  UpdateWebsiteOptionsDto,
  UpdateWebsiteDescriptionDto,
  ValidateWebsiteOptionsDto,
} from '@postybirb/types';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { WebsiteOptionsRepository } from '@postybirb/database';
import { PostyBirbController } from '../common/controller/postybirb-controller';

import { WebsiteOptionsService } from './website-options.service';

/**
 * CRUD operation on WebsiteOptions.
 *
 * @class WebsiteOptionsController
 */
@ApiTags('website-option')
@Controller('website-option')
export class WebsiteOptionsController extends PostyBirbController<WebsiteOptionsRepository> {
  constructor(readonly service: WebsiteOptionsService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Website option created.' })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiNotFoundResponse({
    description: 'Account or website instance not found.',
  })
  create(
    @Body()
    createDto: CreateWebsiteOptionsDto,
  ) {
    return this.service.create(createDto).then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Submission fields updated; description snapshots are preserved.',
  })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  update(
    @Body()
    updateDto: UpdateWebsiteOptionsDto,
    @Param('id') id: EntityId,
  ) {
    return this.service.update(id, updateDto, 'preserve').then((entity) => entity.toDTO());
  }

  @Patch(':id/description')
  @ApiOkResponse({ description: 'Description saved without updating other fields.' })
  @ApiConflictResponse({ description: 'The description revision has changed.' })
  updateDescription(
    @Body() updateDto: UpdateWebsiteDescriptionDto,
    @Param('id') id: EntityId,
  ) {
    return this.service
      .updateDescription(id, updateDto)
      .then((entity) => entity.toDTO());
  }

  @Patch('submission/:id')
  @ApiOkResponse({ description: 'Submission updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  updateSubmission(
    @Body()
    updateDto: UpdateSubmissionWebsiteOptionsDto,
    @Param('id') submissionId: SubmissionId,
  ) {
    return this.service
      .updateSubmissionOptions(submissionId, updateDto)
      .then((entity) => entity.toDTO());
  }

  @Post('validate')
  @ApiOkResponse({ description: 'Submission validation completed.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  validate(@Body() validateOptionsDto: ValidateWebsiteOptionsDto) {
    return this.service.validateWebsiteOption(validateOptionsDto);
  }

  @Get('validate/:submissionId')
  @ApiOkResponse({ description: 'Submission validation completed.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  validateSubmission(@Param('submissionId') submissionId: SubmissionId) {
    return this.service.validateSubmission(submissionId);
  }

  @Post('preview-description')
  @ApiOkResponse({ description: 'Description preview generated.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Submission or option not found.' })
  previewDescription(@Body() dto: PreviewDescriptionDto) {
    return this.service.previewDescription(dto);
  }
}
