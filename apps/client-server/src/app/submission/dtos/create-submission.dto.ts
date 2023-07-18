import { ApiProperty } from '@nestjs/swagger';
import { ICreateSubmissionDto, SubmissionType } from '@postybirb/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto implements ICreateSubmissionDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ enum: SubmissionType })
  @IsOptional()
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
