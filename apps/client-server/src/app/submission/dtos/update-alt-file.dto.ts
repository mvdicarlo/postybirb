import { IUpdateAltFileDto } from '@postybirb/types';
import { IsString } from 'class-validator';

export class UpdateAltFileDto implements IUpdateAltFileDto {
  @IsString()
  text: string;
}
