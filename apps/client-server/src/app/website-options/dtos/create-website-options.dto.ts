import { ApiProperty } from '@nestjs/swagger';
import {
  ICreateWebsiteOptionsDto,
  IWebsiteFormFields,
  SubmissionId,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CreateWebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> implements ICreateWebsiteOptionsDto
{
  @ApiProperty()
  @IsString()
  account: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;

  @ApiProperty()
  @IsString()
  submission: SubmissionId;

  isDefault?: boolean = false;
}
