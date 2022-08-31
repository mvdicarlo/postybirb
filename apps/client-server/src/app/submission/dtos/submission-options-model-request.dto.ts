import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import SubmissionType from '../enums/submission-type';

export class SubmissionOptionsModelRequestDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
