import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { BaseOptions } from '../models/base-website-options';

export class UpdateSubmissionOptionsDto<T extends BaseOptions> {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;
}
