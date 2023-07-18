import { ApiProperty } from '@nestjs/swagger';
import {
  IValidateWebsiteOptionsDto,
  IWebsiteFormFields,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class ValidateWebsiteOptionsDto implements IValidateWebsiteOptionsDto {
  @ApiProperty()
  @IsString()
  submission: string;

  @ApiProperty()
  @IsString()
  account: string;

  @ApiProperty({ type: Object })
  @IsObject()
  options: IWebsiteFormFields;

  @ApiProperty({ type: Object })
  @IsObject()
  defaultOptions: IWebsiteFormFields;
}
