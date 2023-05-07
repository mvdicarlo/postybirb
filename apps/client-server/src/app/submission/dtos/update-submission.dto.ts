import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionDto } from '@postybirb/dto';
import {
  FileSubmissionMetadata,
  ISubmissionAccountData,
  ISubmissionFields,
  ISubmissionMetadata,
  ScheduleType,
} from '@postybirb/types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSubmissionDto implements IUpdateSubmissionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsBoolean()
  isScheduled: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  scheduledFor: string | null | undefined;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  deletedOptions?: ISubmissionAccountData<ISubmissionFields>[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: ISubmissionAccountData<ISubmissionFields>[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata?: ISubmissionMetadata | FileSubmissionMetadata;
}
