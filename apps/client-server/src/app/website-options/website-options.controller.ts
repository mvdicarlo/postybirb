import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EntityId, SubmissionId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { UpdateSubmissionWebsiteOptionsDto } from './dtos/update-submission-website-options.dto';
import { UpdateWebsiteOptionsDto } from './dtos/update-website-options.dto';
import { ValidateWebsiteOptionsDto } from './dtos/validate-website-options.dto';
import { WebsiteOptionsService } from './website-options.service';

/**
 * CRUD operation on WebsiteOptions.
 *
 * @class WebsiteOptionsController
 */
@ApiTags('website-option')
@Controller('website-option')
export class WebsiteOptionsController extends PostyBirbController<'WebsiteOptionsSchema'> {
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
  @ApiOkResponse({ description: 'Submission option updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  update(
    @Body()
    updateDto: UpdateWebsiteOptionsDto,
    @Param('id') id: EntityId,
  ) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
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
}
