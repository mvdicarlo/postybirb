import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { NULL_ACCOUNT_ID } from '@postybirb/types';
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
    return request.accountId === NULL_ACCOUNT_ID
      ? this.service.getDefaultForm(request.type)
      : this.service.generateForm(request);
  }
}
