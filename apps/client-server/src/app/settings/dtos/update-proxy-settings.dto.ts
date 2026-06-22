/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { ProxyMode, ProxyType } from '@postybirb/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateProxyPoolEntryDto {
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

export class UpdateProxyConfigurationDto {
  @ApiProperty({
    enum: ['system', 'direct', 'fixed_servers', 'pac_routing'],
  })
  @IsIn(['system', 'direct', 'fixed_servers', 'pac_routing'])
  mode: ProxyMode;

  @ApiProperty({ type: [UpdateProxyPoolEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProxyPoolEntryDto)
  pool: UpdateProxyPoolEntryDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fixedProxyId?: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  routing: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pacAccessToken?: string;
}

export class TestProxyPoolEntryDto extends UpdateProxyPoolEntryDto {}

export class TestRemoteConnectionDto {
  @ApiProperty()
  @IsString()
  hostUrl: string;

  @ApiProperty()
  @IsString()
  password: string;
}

/** @deprecated v2 profile shape — kept for transitional API clients */
export class UpdateProxyProfileDto extends UpdateProxyPoolEntryDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty({ type: [String] })
  websites: string[];
}

/** @deprecated v2 profile shape */
export class TestProxyProfileDto extends UpdateProxyProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  websiteId?: string;
}
