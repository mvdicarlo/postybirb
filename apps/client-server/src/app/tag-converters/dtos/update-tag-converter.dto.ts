import { ApiProperty } from '@nestjs/swagger';
import { IUpdateTagConverterDto } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class UpdateTagConverterDto implements IUpdateTagConverterDto {
  @ApiProperty()
  @IsString()
  tag: string;

  @ApiProperty()
  @IsObject()
  convertTo: Record<string, string>;
}
