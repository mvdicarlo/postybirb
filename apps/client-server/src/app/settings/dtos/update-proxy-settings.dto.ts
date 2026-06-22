import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TestRemoteConnectionDto {
  @ApiProperty()
  @IsString()
  hostUrl: string;

  @ApiProperty()
  @IsString()
  password: string;
}
