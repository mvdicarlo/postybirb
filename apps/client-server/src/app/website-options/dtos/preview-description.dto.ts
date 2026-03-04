import { ApiProperty } from '@nestjs/swagger';
import {
  EntityId,
  IPreviewDescriptionDto,
  SubmissionId,
} from '@postybirb/types';
import { IsString } from 'class-validator';

export class PreviewDescriptionDto implements IPreviewDescriptionDto {
  @ApiProperty()
  @IsString()
  submissionId: SubmissionId;

  @ApiProperty()
  @IsString()
  websiteOptionId: EntityId;
}
