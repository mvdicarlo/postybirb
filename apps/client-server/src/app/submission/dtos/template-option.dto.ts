import { ApiProperty } from '@nestjs/swagger';
import { AccountId, IWebsiteFormFields } from '@postybirb/types';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

/**
 * Single template option to apply.
 */
export class TemplateOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountId: AccountId;

  @ApiProperty({ type: Object })
  @IsObject()
  data: IWebsiteFormFields;
}
