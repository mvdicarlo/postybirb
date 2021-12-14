import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ScheduleType } from '../enums/schedule-type.enum';

export class UpdateSubmissionDto {
  @ApiProperty()
  @IsBoolean()
  isSchduled: boolean;

  @ApiProperty()
  @IsString()
  scheduledFor: string;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;
}
