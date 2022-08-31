import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { BaseOptions } from '../models/base-website-options';

export class CreateSubmissionOptionsDto<T extends BaseOptions> {
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
