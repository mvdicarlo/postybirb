import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  DynamicObject,
  ISetWebsiteDataRequestDto,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class SetWebsiteDataRequestDto
  implements ISetWebsiteDataRequestDto<DynamicObject>
{
  @ApiProperty()
  @IsString()
  id: AccountId;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  data: DynamicObject;
}
