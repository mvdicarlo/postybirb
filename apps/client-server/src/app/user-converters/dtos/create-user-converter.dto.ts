import { ApiProperty } from '@nestjs/swagger';
import { ICreateUserConverterDto } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CreateUserConverterDto implements ICreateUserConverterDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsObject()
  convertTo: Record<string, string>;
}
