import { ApiProperty } from '@nestjs/swagger';
import { ISubmissionFields } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CreateSubmissionOptionsDto<T extends ISubmissionFields> {
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
