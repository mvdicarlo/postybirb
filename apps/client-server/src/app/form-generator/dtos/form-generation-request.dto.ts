import { ApiProperty } from '@nestjs/swagger';
import { IFormGenerationRequestDto, SubmissionType } from '@postybirb/types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class FormGenerationRequestDto implements IFormGenerationRequestDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isMultiSubmission?: boolean;
}
