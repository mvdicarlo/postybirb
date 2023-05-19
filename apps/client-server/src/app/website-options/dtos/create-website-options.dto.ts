import { ApiProperty } from '@nestjs/swagger';
import {
  ICreateWebsiteOptionsDto,
  IWebsiteFormFields,
  SubmissionId,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';
import { AccountId } from 'libs/types/src/models/account/account.type';

export class CreateWebsiteOptionsDto<T extends IWebsiteFormFields>
  implements ICreateWebsiteOptionsDto
{
  @ApiProperty()
  @IsString()
  accountId: AccountId;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;

  @ApiProperty()
  @IsString()
  submissionId: SubmissionId;
}
