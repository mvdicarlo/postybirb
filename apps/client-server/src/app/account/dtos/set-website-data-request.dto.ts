import { ApiProperty } from '@nestjs/swagger';
import { ISetWebsiteDataRequestDto } from '@postybirb/dto';
import { SafeObject } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class SetWebsiteDataRequestDto
  implements ISetWebsiteDataRequestDto<SafeObject>
{
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  data: SafeObject;
}
