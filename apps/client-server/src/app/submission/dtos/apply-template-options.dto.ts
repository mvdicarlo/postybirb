import { ApiProperty } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsString,
    ValidateNested,
} from 'class-validator';
import { TemplateOptionDto } from './template-option.dto';

/**
 * DTO for applying selected template options to multiple submissions.
 */
export class ApplyTemplateOptionsDto {
  @ApiProperty({ description: 'Submission IDs to apply template options to' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  targetSubmissionIds: SubmissionId[];

  @ApiProperty({
    description: 'Template options to apply',
    type: [TemplateOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateOptionDto)
  options: TemplateOptionDto[];

  @ApiProperty({ description: 'Whether to replace title with template title' })
  @IsBoolean()
  overrideTitle: boolean;

  @ApiProperty({
    description: 'Whether to replace description with template description',
  })
  @IsBoolean()
  overrideDescription: boolean;
}
