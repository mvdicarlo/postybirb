import { ApiProperty } from '@nestjs/swagger';
import { SubmissionType } from '@postybirb/types';
import { IsEnum, IsString } from 'class-validator';

export class SubmissionOptionsModelRequestDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
