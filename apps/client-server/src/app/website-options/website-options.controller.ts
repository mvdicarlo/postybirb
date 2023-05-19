import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IWebsiteFormFields } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { WebsiteOptions } from '../database/entities';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
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
export class WebsiteOptionsController extends PostyBirbController<WebsiteOptions> {
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
    createDto: CreateWebsiteOptionsDto<IWebsiteFormFields>
  ) {
    return this.service.create(createDto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Submission option updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission option Id not found.' })
  update(
    @Body()
    updateDto: UpdateWebsiteOptionsDto<IWebsiteFormFields>,
    @Param('id') id: string
  ) {
    return this.service.update(id, updateDto);
  }

  @Post('validate')
  @ApiOkResponse({ description: 'Submission validation completed.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  validate(@Body() validateOptionsDto: ValidateWebsiteOptionsDto) {
    return this.service.validateWebsiteOption(validateOptionsDto);
  }
}
