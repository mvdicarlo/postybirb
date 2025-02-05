import { ApiProperty } from '@nestjs/swagger';
import { IApplyMultiSubmissionDto, SubmissionId } from '@postybirb/types';
import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ApplyMultiSubmissionDto implements IApplyMultiSubmissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  submissionToApply: SubmissionId;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  submissionIds: SubmissionId[];

  @ApiProperty()
  @IsBoolean()
  merge: boolean;
}
