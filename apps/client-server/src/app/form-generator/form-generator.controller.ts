import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionType } from '@postybirb/types';
import { FormGenerationRequestDto } from './dtos/form-generation-request.dto';
import { FormGeneratorService } from './form-generator.service';

@ApiTags('form-generator')
@Controller('form-generator')
export class FormGeneratorController {
  constructor(private readonly service: FormGeneratorService) {}

  @Post()
  @ApiResponse({
    status: 200,
    description: 'Returns the generated form with default',
  })
  @ApiResponse({ status: 404, description: 'Website instance not found.' })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing operation.',
  })
  getFormForWebsite(@Body() request: FormGenerationRequestDto) {
    return this.service.generateForm(request);
  }

  @Get('default/:type')
  @ApiResponse({
    status: 200,
    description: 'Returns the default form',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing operation.',
  })
  getDefaultForm(@Param('type') type: SubmissionType) {
    return this.service.getDefaultForm(type);
  }
}
