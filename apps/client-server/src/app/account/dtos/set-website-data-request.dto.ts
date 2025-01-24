import { ApiProperty } from '@nestjs/swagger';
import {
  DynamicObject,
  EntityId,
  ISetWebsiteDataRequestDto,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class SetWebsiteDataRequestDto
  implements ISetWebsiteDataRequestDto<DynamicObject>
{
  @ApiProperty()
  @IsString()
  id: EntityId;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  data: DynamicObject;
}
