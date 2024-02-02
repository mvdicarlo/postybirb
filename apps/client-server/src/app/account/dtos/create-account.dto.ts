import { ApiProperty } from '@nestjs/swagger';
import { ICreateAccountDto } from '@postybirb/types';
import { IsArray, IsString, Length } from 'class-validator';

/**
 * Account creation request object.
 */
export class CreateAccountDto implements ICreateAccountDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty()
  @IsString()
  @Length(1)
  website: string;

  @ApiProperty()
  @IsArray()
  groups: string[];
}
