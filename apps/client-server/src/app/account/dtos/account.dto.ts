import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IAccountDto } from '@postybirb/dto';
import { ILoginState } from '../../websites/models/login-state.interface';
import { IAccount } from '../models/account.interface';
import { SafeObject } from '../../shared/types/safe-object.type';

export class AccountDto<T extends SafeObject>
  implements IAccount, IAccountDto<T>
{
  /**
   * Id of an account and the session partition key.
   * @type {string}
   */
  @ApiProperty()
  @IsString()
  id: string;

  /**
   * Display name.
   * @type {string}
   */
  @ApiProperty()
  @IsString()
  name: string;

  /**
   * Website associated with Account.
   * @type {string}
   */
  @ApiProperty()
  @IsString()
  website: string;

  /**
   * Current login state of website instance.
   * @type {ILoginState}
   */
  @ApiProperty()
  @IsObject()
  loginState: ILoginState;

  /**
   * Any additional data (i.e. tokens).
   * @type {T}
   */
  @ApiProperty()
  @IsObject()
  data: T;
}
