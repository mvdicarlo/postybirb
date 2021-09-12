import { ILoginState } from '../../websites/interfaces/login-state.interface';
import { IAccount } from '../interfaces/account.interface';
import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccountDto<T extends Record<string, unknown>> implements IAccount {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  website: string;

  @ApiProperty()
  @IsObject()
  loginState: ILoginState;

  @ApiProperty()
  @IsObject()
  data: T;
}
