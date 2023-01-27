import { ApiProperty } from '@nestjs/swagger';
import { IBaseWebsiteOptions } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CreateSubmissionOptionsDto<T extends IBaseWebsiteOptions> {
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
