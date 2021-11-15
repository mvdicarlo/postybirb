import { IAccount } from '../interfaces/account.interface';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Account creation request object.
 */
export class CreateAccountDto implements Omit<IAccount, 'id'> {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  website: string;
}
