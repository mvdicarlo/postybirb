import { ApiProperty } from '@nestjs/swagger';
import {
  FileSubmissionMetadata,
  ISubmissionMetadata,
  IUpdateSubmissionDto,
  IWebsiteFormFields,
  ScheduleType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSubmissionDto implements IUpdateSubmissionDto {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsISO8601()
  scheduledFor?: string | null | undefined;

  @ApiProperty({ enum: ScheduleType })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  cron?: string | null | undefined;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  deletedWebsiteOptions?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: WebsiteOptionsDto<IWebsiteFormFields>[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata?: ISubmissionMetadata | FileSubmissionMetadata;
}
