import { ApiProperty } from '@nestjs/swagger';
import { IAccount, SubmissionType } from '@postybirb/types';
import { IsEnum, IsObject } from 'class-validator';

export class FormGenerationRequestDto {
  @ApiProperty()
  @IsObject()
  account: IAccount;

  @ApiProperty()
  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
