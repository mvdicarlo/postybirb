import { ApiProperty } from '@nestjs/swagger';
import { DynamicObject, IOAuthWebsiteRequestDto } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class OAuthWebsiteRequestDto<T extends DynamicObject>
  implements IOAuthWebsiteRequestDto<T>
{
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  website: string;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  data: T;

  @ApiProperty()
  @IsString()
  state: string;
}
