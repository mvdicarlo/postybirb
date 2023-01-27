import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IBaseWebsiteOptions } from '@postybirb/types';
import { CreateSubmissionOptionsDto } from './dtos/create-submission-options.dto';
import { UpdateSubmissionOptionsDto } from './dtos/update-submission-options.dto';
import { ValidateSubmissionOptionsDto } from './dtos/validate-submission-options.dto';
import { SubmissionOptionsService } from './submission-options.service';

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
    @Body()
    createSubmissionOptionsDto: CreateSubmissionOptionsDto<IBaseWebsiteOptions>
  ) {
    return this.service.create(createSubmissionOptionsDto);
  }

  @Patch()
  @ApiOkResponse({ description: 'Submission option updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  update(
    @Body()
    updateSubmissionOptionsDto: UpdateSubmissionOptionsDto<IBaseWebsiteOptions>
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

  @Post('validate')
  @ApiOkResponse({ description: 'Submission validation completed.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  validate(@Body() validateSubmissionOptionsDto: ValidateSubmissionOptionsDto) {
    return this.service.validateSubmissionOption(validateSubmissionOptionsDto);
  }
}
