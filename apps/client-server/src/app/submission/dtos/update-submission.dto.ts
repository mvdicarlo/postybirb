import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ScheduleType } from '../enums/schedule-type';

export class UpdateSubmissionDto {
  @ApiProperty()
  @IsBoolean()
  isScheduled: boolean;

  @ApiProperty()
  @IsString()
  scheduledFor: string;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;
}
