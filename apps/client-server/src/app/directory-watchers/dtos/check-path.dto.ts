import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckPathDto {
  @ApiProperty({ description: 'The directory path to check' })
  @IsNotEmpty()
  @IsString()
  path: string;
}
