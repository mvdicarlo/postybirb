import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { BaseWebsiteOptions } from '../models/base-website-options';

export class UpdateSubmissionOptionsDto<T extends BaseWebsiteOptions> {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;
}
