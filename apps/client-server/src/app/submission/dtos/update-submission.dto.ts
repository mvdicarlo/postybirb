import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionDto } from '@postybirb/dto';
import {
  FileSubmissionMetadata,
  IBaseSubmissionMetadata,
  IBaseWebsiteOptions,
  ISubmissionOptions,
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
  deletedOptions?: ISubmissionOptions<IBaseWebsiteOptions>[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: ISubmissionOptions<IBaseWebsiteOptions>[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata?: IBaseSubmissionMetadata | FileSubmissionMetadata;
}
