import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionDto } from '@postybirb/dto';
import { ScheduleType } from '@postybirb/types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

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
  scheduledFor: string | null;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;
}
