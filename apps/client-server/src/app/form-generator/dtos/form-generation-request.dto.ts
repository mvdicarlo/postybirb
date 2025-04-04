import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  EntityId,
  IFormGenerationRequestDto,
  SubmissionType,
} from '@postybirb/types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class FormGenerationRequestDto implements IFormGenerationRequestDto {
  @ApiProperty()
  @IsString()
  accountId: AccountId;

  @ApiProperty()
  @IsString()
  optionId: EntityId;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isMultiSubmission?: boolean;
}
