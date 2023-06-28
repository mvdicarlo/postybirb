import { ApiProperty } from '@nestjs/swagger';
import { ISetWebsiteDataRequestDto } from '@postybirb/dto';
import { DynamicObject } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class SetWebsiteDataRequestDto
  implements ISetWebsiteDataRequestDto<DynamicObject>
{
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  data: DynamicObject;
}
