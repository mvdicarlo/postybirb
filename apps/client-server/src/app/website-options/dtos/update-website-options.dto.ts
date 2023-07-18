import { ApiProperty } from '@nestjs/swagger';
import { IUpdateWebsiteOptionsDto, IWebsiteFormFields } from '@postybirb/types';
import { IsObject } from 'class-validator';

export class UpdateWebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> implements IUpdateWebsiteOptionsDto<T>
{
  @ApiProperty({ type: Object })
  @IsObject()
  data: T;
}
