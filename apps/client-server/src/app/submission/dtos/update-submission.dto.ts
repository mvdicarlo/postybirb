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
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSubmissionDto implements IUpdateSubmissionDto {
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
  deletedWebsiteOptions?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: WebsiteOptionsDto<IWebsiteFormFields>[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata: ISubmissionMetadata | FileSubmissionMetadata;
}
