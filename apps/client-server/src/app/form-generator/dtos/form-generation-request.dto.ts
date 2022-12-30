import { ApiProperty } from '@nestjs/swagger';
import { IFormGenerationRequestDto } from '@postybirb/dto';
import { IAccount, SubmissionType } from '@postybirb/types';
import { IsEnum, IsObject } from 'class-validator';

export class FormGenerationRequestDto implements IFormGenerationRequestDto {
  @ApiProperty()
  @IsObject()
  account: IAccount;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;
}
