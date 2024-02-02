import { ApiProperty } from '@nestjs/swagger';
import { IUpdateAccountDto } from '@postybirb/types';
import { IsArray, IsString } from 'class-validator';

/**
 * Account update request object.
 */
export class UpdateAccountDto implements IUpdateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  groups: string[];
}
