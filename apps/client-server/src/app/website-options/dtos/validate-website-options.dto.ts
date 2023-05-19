import { ApiProperty } from '@nestjs/swagger';
import {
  IValidateWebsiteOptionsDto,
  IWebsiteFormFields,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class ValidateWebsiteOptionsDto implements IValidateWebsiteOptionsDto {
  @ApiProperty()
  @IsString()
  submissionId: string;

  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ type: Object })
  @IsObject()
  options: IWebsiteFormFields;

  @ApiProperty({ type: Object })
  @IsObject()
  defaultOptions: IWebsiteFormFields;
}
