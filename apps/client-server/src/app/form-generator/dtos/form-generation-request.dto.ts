import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  IFormGenerationRequestDto,
  SubmissionType,
} from '@postybirb/types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class FormGenerationRequestDto implements IFormGenerationRequestDto {
  @ApiProperty()
  @IsString()
  accountId: AccountId;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isMultiSubmission?: boolean;
}
