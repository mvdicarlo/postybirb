import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SafeObject } from '../shared/types/safe-object.type';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import { WebsiteRegistryService } from './website-registry.service';

/**
 * Special operations to be run on website instances.
 * @class WebsitesController
 */
@ApiTags('websites')
@Controller('websites')
export class WebsitesController {
  constructor(
    private readonly websiteRegistryService: WebsiteRegistryService
  ) {}

  @Post('/oauth')
  @ApiResponse({ status: 200, description: 'Authorization step completed.' })
  @ApiResponse({ status: 404, description: 'Website instance not found.' })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing authorization operation.',
  })
  getWebsiteData(@Body() oauthRequestDto: OAuthWebsiteRequestDto<SafeObject>) {
    return this.websiteRegistryService.performOAuthStep(oauthRequestDto);
  }
}
