import { ApiProperty } from '@nestjs/swagger';
import { IUpdateTagGroupDto } from '@postybirb/types';
import { IsArray, IsString } from 'class-validator';

export class UpdateTagGroupDto implements IUpdateTagGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  tags: string[];
}
