import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionDto } from '@postybirb/dto';
import {
  BaseWebsiteOptions,
  ISubmissionOptions,
  ScheduleType,
} from '@postybirb/types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
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
  deletedOptions?: ISubmissionOptions<BaseWebsiteOptions>[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  newOrUpdatedOptions?: ISubmissionOptions<BaseWebsiteOptions>[];
}
