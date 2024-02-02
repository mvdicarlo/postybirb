import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { Account } from '../database/entities/account.entity';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

/**
 * CRUD operations on Account data.
 * @class AccountController
 */
@ApiTags('account')
@Controller('account')
export class AccountController extends PostyBirbController<Account> {
  constructor(readonly service: AccountService) {
    super(service);
  }

  @Post()
  @ApiOkResponse({ description: 'Account created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.service
      .create(createAccountDto)
      .then((account) => account.toJSON());
  }

  @Post('/clear/:id')
  @ApiOkResponse({ description: 'Account data cleared.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  async clear(@Param('id') id: string) {
    await this.service.clearAccountData(id);
    return this.service.manuallyExecuteOnLogin(id);
  }

  @Get('/refresh/:id')
  @ApiOkResponse({ description: 'Account login check queued.' })
  async refresh(@Param('id') id: string) {
    this.service.manuallyExecuteOnLogin(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Account updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Account Id not found.' })
  update(@Body() updateAccountDto: UpdateAccountDto, @Param('id') id: string) {
    return this.service
      .update(id, updateAccountDto)
      .then((entity) => entity.toJSON());
  }

  @Post('/account-data')
  @ApiOkResponse({ description: 'Account data set.' })
  setWebsiteData(@Body() oauthRequestDto: SetWebsiteDataRequestDto) {
    return this.service.setAccountData(oauthRequestDto);
  }
}
