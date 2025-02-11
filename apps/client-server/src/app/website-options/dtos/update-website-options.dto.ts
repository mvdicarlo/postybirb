import { ApiProperty } from '@nestjs/swagger';
import { IUpdateWebsiteOptionsDto, IWebsiteFormFields } from '@postybirb/types';
import { IsObject } from 'class-validator';

export class UpdateWebsiteOptionsDto implements IUpdateWebsiteOptionsDto {
  @ApiProperty({ type: Object })
  @IsObject()
  data: IWebsiteFormFields;
}
