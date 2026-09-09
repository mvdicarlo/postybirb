import { ApiProperty } from '@nestjs/swagger';
import {
  ISubmissionMetadata,
  IUpdateSubmissionDto,
  IWebsiteFormFields,
  ScheduleType,
  SubmissionId,
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
  IsUUID,
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
  scheduledFor?: string | undefined;

  @ApiProperty({ enum: ScheduleType })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  cron?: string | undefined;

  @ApiProperty({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependsOn?: SubmissionId[];

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
  metadata?: ISubmissionMetadata;
}
