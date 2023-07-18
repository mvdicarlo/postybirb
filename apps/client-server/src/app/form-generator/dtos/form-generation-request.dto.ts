import { ApiProperty } from '@nestjs/swagger';
import { IFormGenerationRequestDto, SubmissionType } from '@postybirb/types';
import { IsEnum, IsString } from 'class-validator';

export class FormGenerationRequestDto implements IFormGenerationRequestDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
