import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ICreateAccountDto } from '@postybirb/dto';

/**
 * Account creation request object.
 */
export class CreateAccountDto implements ICreateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  website: string;
}
