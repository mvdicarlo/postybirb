import { IAccount } from '../interfaces/account.interface';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto implements Omit<IAccount, 'id'> {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  website: string;
}
