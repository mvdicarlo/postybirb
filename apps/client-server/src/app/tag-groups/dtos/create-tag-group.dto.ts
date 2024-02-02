import { ApiProperty } from '@nestjs/swagger';
import { ICreateTagGroupDto } from '@postybirb/types';
import { IsArray, IsString } from 'class-validator';

export class CreateTagGroupDto implements ICreateTagGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  tags: string[];
}
