import { DynamicObject, OAuthWebsiteRequestDto } from '@postybirb/types';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { WebsiteRegistryService } from './website-registry.service';

/**
 * Special operations to be run on website instances.
 * @class WebsitesController
 */
@ApiTags('websites')
@Controller('websites')
export class WebsitesController {
  constructor(
    private readonly websiteRegistryService: WebsiteRegistryService,
  ) {}

  @Post('oauth')
  @ApiResponse({ status: 200, description: 'Authorization step completed.' })
  @ApiResponse({ status: 404, description: 'Website instance not found.' })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing authorization operation.',
  })
  performOAuthStep(
    @Body() oauthRequestDto: OAuthWebsiteRequestDto<DynamicObject>,
  ) {
    return this.websiteRegistryService.performOAuthStep(oauthRequestDto);
  }

  @Get('info')
  @ApiResponse({ status: 200 })
  getWebsiteLoginInfo() {
    return this.websiteRegistryService.getWebsiteDefinitions();
  }
}
