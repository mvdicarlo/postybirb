import { ApiProperty } from '@nestjs/swagger';
import { EntityId, IUpdateAccountDto } from '@postybirb/types';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * Account update request object.
 */
export class UpdateAccountDto implements IUpdateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  groups: string[];

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  defaultFileTemplateId?: EntityId | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  defaultMessageTemplateId?: EntityId | null;
}
