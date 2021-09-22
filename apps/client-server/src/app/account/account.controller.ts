import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

/**
 * @todo return get with login state
 *
 * @class AccountController
 */
@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'A list of all account records.' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'The requested Account.' })
  @ApiResponse({ status: 404, description: 'Account Id not found.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiResponse({ status: 200, description: 'Account created.' })
  @ApiResponse({ status: 400, description: 'Bad request made.' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.service.create(createAccountDto);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Account updated.', type: Boolean })
  @ApiResponse({ status: 404, description: 'Account Id not found.' })
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.service.update(id, updateAccountDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully.',
    type: Boolean,
  })
  @ApiResponse({ status: 404, description: 'Account Id not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
