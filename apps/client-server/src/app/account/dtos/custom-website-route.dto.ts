import { ApiProperty } from '@nestjs/swagger';
import {
  AccountId,
  DynamicObject,
  ICustomWebsiteRouteDto,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class CustomWebsiteRouteDto implements ICustomWebsiteRouteDto {
  @ApiProperty()
  @IsString()
  id: AccountId;

  @ApiProperty()
  @IsString()
  route: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: DynamicObject;
}
