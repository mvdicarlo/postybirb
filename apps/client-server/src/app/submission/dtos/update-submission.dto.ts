import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from '@postybirb/types';
import { IsBoolean, IsEnum, IsString } from 'class-validator';

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
