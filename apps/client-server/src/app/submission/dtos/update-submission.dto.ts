import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionDto } from '@postybirb/dto';
import {
  FileSubmissionMetadata,
  IWebsiteOptions,
  IWebsiteFormFields,
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
  deletedOptions?: IWebsiteOptions<IWebsiteFormFields>[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: IWebsiteOptions<IWebsiteFormFields>[];

  @ApiProperty()
  @IsOptional()
  @IsObject()
  metadata?: ISubmissionMetadata | FileSubmissionMetadata;
}
