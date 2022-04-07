import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IUpdateAccountDto } from '@postybirb/dto';

/**
 * Account update request object.
 */
export class UpdateAccountDto implements IUpdateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsBoolean()
  favorite: boolean;

  @ApiProperty()
  @IsBoolean()
  hidden: boolean;
}
