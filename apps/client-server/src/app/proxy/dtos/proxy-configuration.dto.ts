/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { ProxyMode } from '@postybirb/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProxyPoolEntryDto } from './proxy-pool-entry.dto';

export class UpdateProxyConfigurationDto {
  @ApiProperty({
    enum: ['system', 'direct', 'fixed_servers', 'pac_routing'],
  })
  @IsIn(['system', 'direct', 'fixed_servers', 'pac_routing'])
  mode: ProxyMode;

  @ApiProperty({ type: [ProxyPoolEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProxyPoolEntryDto)
  pool: ProxyPoolEntryDto[];

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
