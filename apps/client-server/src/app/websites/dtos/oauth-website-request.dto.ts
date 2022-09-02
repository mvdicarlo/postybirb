import { ApiProperty } from '@nestjs/swagger';
import { SafeObject } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class OAuthWebsiteRequestDto<T extends SafeObject> {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  website: string;

  @ApiProperty()
  @IsObject()
  data: T;

  @ApiProperty()
  @IsString()
  state: string;
}
