import { ApiProperty } from '@nestjs/swagger';
import { IUpdateAccountDto } from '@postybirb/dto';
import { IsString } from 'class-validator';

/**
 * Account update request object.
 */
export class UpdateAccountDto implements IUpdateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;
}
