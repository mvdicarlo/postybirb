import { ApiProperty } from '@nestjs/swagger';
import { IUpdateTagGroupDto } from '@postybirb/dto';
import { IsString } from 'class-validator';

export class UpdateTagGroupDto implements IUpdateTagGroupDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  tags: string[];
}
