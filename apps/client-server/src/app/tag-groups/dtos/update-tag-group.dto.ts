import { ApiProperty } from '@nestjs/swagger';
import { IUpdateTagGroupDto } from '@postybirb/dto';
import { IsArray, IsString } from 'class-validator';

export class UpdateTagGroupDto implements IUpdateTagGroupDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  tags: string[];
}
