import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { BaseWebsiteOptions } from '../models/base-website-options';

export class CreateSubmissionPartDto<T extends BaseWebsiteOptions> {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;

  @ApiProperty()
  @IsString()
  submissionId: string;
}
