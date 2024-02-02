import { ApiProperty } from '@nestjs/swagger';
import { ICreateTagConverterDto } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CreateTagConverterDto implements ICreateTagConverterDto {
  @ApiProperty()
  @IsString()
  tag: string;

  @ApiProperty()
  @IsObject()
  convertTo: Record<string, string>;
}
