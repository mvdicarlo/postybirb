import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSubmissionPartDto } from '../dtos/create-submission-part.dto';
import { SubmissionPartModelRequestDto } from '../dtos/submission-part-model-request.dto';
import { UpdateSubmissionPartDto } from '../dtos/update-submission-part.dto';
import BaseWebsiteOptions from '../models_maybe/base-website-options.model';
import { SubmissionPartService } from '../services/submission-part.service';

/**
 * CRUD operation on Submission parts.
 *
 * @class SubmissionPartController
 */
@ApiTags('submission-part')
@Controller('submission-part')
export class SubmissionPartController {
  constructor(private readonly service: SubmissionPartService) {}

  @Post()
  @ApiOkResponse({ description: 'Submission part created.' })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiNotFoundResponse({
    description: 'Account or website instance not found.',
  })
  create(@Body() createSubmissionPartDto: CreateSubmissionPartDto<any>) {
    return this.service.create(createSubmissionPartDto);
  }

  @Post('form')
  @ApiOkResponse({ description: 'FormModel retrieved.' })
  @ApiBadRequestResponse({
    description: 'Website instance did not match request.',
  })
  @ApiNotFoundResponse({
    description: 'Account or website instance not found.',
  })
  getSubmissionPartFormModel(
    @Body() requestModelDto: SubmissionPartModelRequestDto
  ) {
    return this.service.generateSubmissionPartFormModel(requestModelDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Submission part updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission part Id not found.' })
  update(
    @Body() updateSubmissionPartDto: UpdateSubmissionPartDto<BaseWebsiteOptions>
  ) {
    return this.service.update(updateSubmissionPartDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Submission part deleted successfully.',
    type: Boolean,
  })
  @ApiNotFoundResponse({ description: 'Submission part Id not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
