import { ILoginState } from '../../websites/models/login-state.interface';
import { IAccount } from '../interfaces/account.interface';
import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SafeObject } from '../../shared/types/safe-object.type';

export class AccountDto<T extends SafeObject> implements IAccount {
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
