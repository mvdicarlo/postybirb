import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  IFormGenerationRequestDto,
  SubmissionType,
} from '@postybirb/types';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, string | number | boolean>;
}
