import { ApiProperty } from '@nestjs/swagger';
import {
    ICreateSubmissionDefaultOptions,
    ICreateSubmissionDto,
    IFileMetadata,
    SubmissionType,
} from '@postybirb/types';
import { Transform } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

/**
 * Helper to parse JSON strings from FormData.
 * Returns the parsed object or the original value if already an object.
 */
function parseJsonField<T>(value: unknown): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
}

export class CreateSubmissionDto implements ICreateSubmissionDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ enum: SubmissionType })
  @IsOptional()
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isTemplate?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isMultiSubmission?: boolean;

  @ApiProperty({ description: 'Default options to apply to all created submissions' })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => parseJsonField<ICreateSubmissionDefaultOptions>(value))
  defaultOptions?: ICreateSubmissionDefaultOptions;

  @ApiProperty({ description: 'Per-file metadata for batch uploads' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseJsonField<IFileMetadata[]>(value))
  fileMetadata?: IFileMetadata[];
}
