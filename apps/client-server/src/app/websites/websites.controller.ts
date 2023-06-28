import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { IWebsiteInfoDto } from '@postybirb/dto';
import { DynamicObject } from '@postybirb/types';
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

  @Post('oauth')
  @ApiResponse({ status: 200, description: 'Authorization step completed.' })
  @ApiResponse({ status: 404, description: 'Website instance not found.' })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while performing authorization operation.',
  })
  getWebsiteData(@Body() oauthRequestDto: OAuthWebsiteRequestDto<DynamicObject>) {
    return this.websiteRegistryService.performOAuthStep(oauthRequestDto);
  }

  @Get('info')
  @ApiResponse({ status: 200 })
  getWebsiteLoginInfo() {
    return this.websiteRegistryService
      .getAvailableWebsites()
      .map((website) => {
        const resObj: IWebsiteInfoDto = {
          loginType: website.prototype.loginType,
          id: website.prototype.metadata.name,
          displayName: website.prototype.metadata.displayName,
          usernameShortcut: website.prototype.usernameShortcut,
          metadata: website.prototype.metadata,
        };

        return resObj;
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}
