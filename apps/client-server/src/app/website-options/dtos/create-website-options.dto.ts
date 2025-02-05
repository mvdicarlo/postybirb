import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  ICreateWebsiteOptionsDto,
  IWebsiteFormFields,
  SubmissionId,
} from '@postybirb/types';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWebsiteOptionsDto implements ICreateWebsiteOptionsDto {
  @ApiProperty()
  @IsString()
  accountId: AccountId;

  @ApiProperty({ type: Object })
  @IsOptional()
  @IsObject()
  data: IWebsiteFormFields;

  @ApiProperty()
  @IsString()
  submissionId: SubmissionId;

  isDefault?: boolean = false;
}
