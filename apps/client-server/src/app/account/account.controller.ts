import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
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
import { DeleteQuery } from '../common/service/modifiers/delete-query';
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

  @Get()
  @ApiOkResponse({ description: 'A list of all account records.' })
  findAll() {
    return this.service.findAllAccountDto();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'The requested Account.' })
  @ApiNotFoundResponse({ description: 'Account not found.' })
  async findOne(
    @Param('id') id: string,
    @Query('refresh', ParseBoolPipe) refresh: boolean
  ) {
    if (refresh) {
      await this.service.manuallyExecuteOnLogin(id);
    }
    return this.service.findAccountDto(id);
  }

  @Post()
  @ApiOkResponse({ description: 'Account created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.service.create(createAccountDto);
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
    return this.service.update(id, updateAccountDto);
  }

  @Delete()
  @ApiOkResponse({
    description: 'Account deleted successfully.',
    type: Boolean,
  })
  async remove(@Query() query: DeleteQuery) {
    return Promise.all(
      query.getIds().map((id) => this.service.remove(id))
    ).then(() => ({
      success: true,
    }));
  }

  @Post('/account-data')
  @ApiOkResponse({ description: 'Account data set.' })
  setWebsiteData(@Body() oauthRequestDto: SetWebsiteDataRequestDto) {
    return this.service.setAccountData(oauthRequestDto);
  }
}
