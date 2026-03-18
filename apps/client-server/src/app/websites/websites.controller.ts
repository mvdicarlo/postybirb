import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { DynamicObject } from '@postybirb/types';
import type { Response } from 'express';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import { storeOAuthCode } from './implementations/instagram/instagram-api-service/instagram-api-service';
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
    return this.websiteRegistryService.getWebsiteInfo();
  }

  /**
   * OAuth callback endpoint for Instagram.
   * Facebook redirects the browser here after user authorization.
   * Stores the code for retrieval by the login UI via the retrieveCode OAuth step.
   */
  @Get('instagram/callback')
  handleInstagramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      res.type('html').send(
        `<html><body style="font-family:system-ui;text-align:center;padding:40px">` +
          `<h2>Authorization Failed</h2>` +
          `<p>${errorDescription || error}</p>` +
          `<p>You can close this tab and try again in PostyBirb.</p>` +
          `</body></html>`,
      );
      return;
    }

    if (code && state) {
      storeOAuthCode(state, code);
      res.type('html').send(
        `<html><body style="font-family:system-ui;text-align:center;padding:40px">` +
          `<h2>&#10004; Authorization Successful</h2>` +
          `<p>You can close this tab and return to PostyBirb.</p>` +
          `<p style="color:#888;font-size:0.85em">The authorization code has been captured automatically.</p>` +
          `</body></html>`,
      );
      return;
    }

    res.type('html').send(
      `<html><body style="font-family:system-ui;text-align:center;padding:40px">` +
        `<h2>Missing Parameters</h2>` +
        `<p>No authorization code received. Please try again.</p>` +
        `</body></html>`,
    );
  }
}
