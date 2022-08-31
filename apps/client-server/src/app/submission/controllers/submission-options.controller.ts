import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSubmissionOptionsDto } from '../dtos/create-submission-options.dto';
import { SubmissionOptionsModelRequestDto } from '../dtos/submission-options-model-request.dto';
import { UpdateSubmissionOptionsDto } from '../dtos/update-submission-options.dto';
import { BaseOptions } from '../models/base-website-options';
import { SubmissionOptionsService } from '../services/submission-options.service';

/**
 * CRUD operation on Submission options.
 *
 * @class SubmissionOptionsController
 */
@ApiTags('submission-option')
@Controller('submission-option')
export class SubmissionOptionsController {
  constructor(private readonly service: SubmissionOptionsService) {}

  @Post()
  @ApiOkResponse({ description: 'Submission option created.' })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiNotFoundResponse({
    description: 'Account or website instance not found.',
  })
  create(
    @Body() createSubmissionOptionsDto: CreateSubmissionOptionsDto<BaseOptions>
  ) {
    return this.service.create(createSubmissionOptionsDto);
  }

  @Post('form')
  @ApiOkResponse({ description: 'FormModel retrieved.' })
  @ApiBadRequestResponse({
    description: 'Website instance did not match request.',
  })
  @ApiNotFoundResponse({
    description: 'Account or website instance not found.',
  })
  getSubmissionOptionsFormModel(
    @Body() requestModelDto: SubmissionOptionsModelRequestDto
  ) {
    return this.service.generateSubmissionOptionsFormModel(requestModelDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Submission option updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  update(
    @Body() updateSubmissionOptionsDto: UpdateSubmissionOptionsDto<BaseOptions>
  ) {
    return this.service.update(updateSubmissionOptionsDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Submission option deleted successfully.',
    type: Boolean,
  })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
