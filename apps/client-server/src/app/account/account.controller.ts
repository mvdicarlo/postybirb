import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountId, EntityId } from '@postybirb/types';
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
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get(':id')
  @ApiOkResponse({ description: 'Account by Id.' })
  findOne(@Param('id') id: AccountId) {
    return this.service.findDtoByIdOrThrow(id);
  }

  @Get()
  @ApiOkResponse({ description: 'A list of all Accounts.' })
  findAll() {
    return this.service.findAllDtos();
  }

  @Post()
  @ApiOkResponse({ description: 'Account created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.service.createDto(createAccountDto);
  }

  @Post('/clear/:id')
  @ApiOkResponse({ description: 'Account data cleared.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  async clear(@Param('id') id: AccountId) {
    await this.service.clearAccountData(id);
    try {
      await this.service.manuallyExecuteOnLogin(id);
    } catch {
      // For some reason throws error that crashes app when deleting account
    }
  }

  @Get('/refresh/:id')
  @ApiOkResponse({ description: 'Account login check completed.' })
  async refresh(@Param('id') id: AccountId) {
    // Await so the caller's request resolves only once the login check has
    // actually finished. This lets the UI's trailing-rerun scheduler run its
    // follow-up check against the freshest cookies/session state rather than
    // racing a fire-and-forget check that may have read stale cookies.
    try {
      await this.service.manuallyExecuteOnLogin(id);
    } catch {
      // Login errors are handled/logged internally by the website instance;
      // never surface them as a 500 that would trigger a UI error toast.
    }
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Account updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Account Id not found.' })
  update(
    @Body() updateAccountDto: UpdateAccountDto,
    @Param('id') id: AccountId,
  ) {
    return this.service.updateDto(id, updateAccountDto);
  }

  @Delete()
  @ApiOkResponse({ description: 'Accounts removed.' })
  async remove(@Query('ids') ids: EntityId | EntityId[]) {
    await Promise.all(
      (Array.isArray(ids) ? ids : [ids]).map((id) => this.service.remove(id)),
    );
    return { success: true };
  }

  @Post('/account-data')
  @ApiOkResponse({ description: 'Account data set.' })
  setWebsiteData(@Body() oauthRequestDto: SetWebsiteDataRequestDto) {
    return this.service.setAccountData(oauthRequestDto);
  }
}
