import { ApiProperty } from '@nestjs/swagger';
import { BaseWebsiteOptions } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class UpdateSubmissionOptionsDto<T extends BaseWebsiteOptions> {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;
}
