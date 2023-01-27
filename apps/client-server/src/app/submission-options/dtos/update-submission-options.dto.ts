import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionOptionsDto } from '@postybirb/dto';
import { IBaseWebsiteOptions } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class UpdateSubmissionOptionsDto<T extends IBaseWebsiteOptions>
  implements IUpdateSubmissionOptionsDto<T>
{
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: Object })
  @IsObject()
  data: T;
}
