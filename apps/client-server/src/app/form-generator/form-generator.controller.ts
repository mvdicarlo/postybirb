import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @Get('default-form')
  @ApiResponse({
    status: 200,
    description: 'Returns the default form',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing operation.',
  })
  getDefaultForm() {
    return this.service.getDefaultForm();
  }
}
