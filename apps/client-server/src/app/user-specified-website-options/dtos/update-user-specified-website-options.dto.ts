import { ApiProperty } from '@nestjs/swagger';
import {
  DynamicObject,
  IUpdateUserSpecifiedWebsiteOptionsDto,
  SubmissionType,
} from '@postybirb/types';
import { IsEnum, IsObject } from 'class-validator';

export class UpdateUserSpecifiedWebsiteOptionsDto
  implements IUpdateUserSpecifiedWebsiteOptionsDto
{
  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsObject()
  options: DynamicObject;
}
