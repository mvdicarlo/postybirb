import { ApiProperty } from '@nestjs/swagger';
import { ICreateSubmissionDto, SubmissionType } from '@postybirb/types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto implements ICreateSubmissionDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ enum: SubmissionType })
  @IsOptional()
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
