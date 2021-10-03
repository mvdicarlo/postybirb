import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { SafeObject } from '../../shared/types/safe-object.type';

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
