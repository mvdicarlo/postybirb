import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Account update request object.
 */
export class UpdateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;
}
