import { ApiProperty } from '@nestjs/swagger';
import { ProxyType } from '@postybirb/types';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ProxyPoolEntryDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ enum: ['http', 'socks5'] })
  @IsIn(['http', 'socks5'])
  type: ProxyType;

  @ApiProperty()
  @IsString()
  host: string;

  @ApiProperty()
  @IsString()
  port: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password: string;
}
