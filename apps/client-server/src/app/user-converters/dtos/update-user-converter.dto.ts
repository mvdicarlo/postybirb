import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IUpdateUserConverterDto } from '@postybirb/types';
import { CreateUserConverterDto } from './create-user-converter.dto';

export class UpdateUserConverterDto
  extends PartialType(CreateUserConverterDto)
  implements IUpdateUserConverterDto
{
  @ApiProperty()
  username?: string;

  @ApiProperty()
  convertTo?: Record<string, string>;
}
