import { ApiProperty } from '@nestjs/swagger';
import {
  DynamicObject,
  EntityId,
  ICreateUserSpecifiedWebsiteOptionsDto,
  SubmissionType,
} from '@postybirb/types';
import { IsEnum, IsObject, IsString } from 'class-validator';

export class CreateUserSpecifiedWebsiteOptionsDto
  implements ICreateUserSpecifiedWebsiteOptionsDto
{
  @ApiProperty()
  @IsObject()
  options: DynamicObject;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @IsString()
  accountId: EntityId;
}
