import { ApiProperty } from '@nestjs/swagger';
import { ProxyType } from '@postybirb/utils/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateProxyProfileDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

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

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  websites: string[];
}

export class UpdateProxyConfigurationDto {
  @ApiProperty({ type: [UpdateProxyProfileDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProxyProfileDto)
  profiles: UpdateProxyProfileDto[];
}

export class TestProxyProfileDto extends UpdateProxyProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  websiteId?: string;
}

export class TestRemoteConnectionDto {
  @ApiProperty()
  @IsString()
  hostUrl: string;

  @ApiProperty()
  @IsString()
  password: string;
}
