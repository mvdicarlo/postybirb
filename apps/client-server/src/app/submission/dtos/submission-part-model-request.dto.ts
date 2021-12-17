import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import SubmissionType from '../enums/submission-type.enum';

export class SubmissionPartModelRequestDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
