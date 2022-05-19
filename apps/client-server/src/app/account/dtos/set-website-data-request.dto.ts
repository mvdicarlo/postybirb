import { ApiProperty } from '@nestjs/swagger';
import { ISetWebsiteDataRequestDto } from '@postybirb/dto';
import { IsObject, IsString } from 'class-validator';
import { SafeObject } from '../../shared/types/safe-object';

export class SetWebsiteDataRequestDto
  implements ISetWebsiteDataRequestDto<SafeObject>
{
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsObject()
  data: SafeObject;
}
