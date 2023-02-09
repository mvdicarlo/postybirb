import { ApiProperty } from '@nestjs/swagger';
import { IAccountDto, IWebsiteInfo } from '@postybirb/dto';
import { ILoginState, SafeObject } from '@postybirb/types';
import { IsArray, IsObject, IsString } from 'class-validator';

export class AccountDto<T extends SafeObject> implements IAccountDto<T> {
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
   * Website info
   * @type {IWebsiteInfoDto}
   */
  websiteInfo: IWebsiteInfo;

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

  /**
   * Tags that the account is listed under.
   * @type {string}
   */
  @ApiProperty()
  @IsArray()
  groups: string[];
}
