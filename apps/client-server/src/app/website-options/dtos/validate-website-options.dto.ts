import { ApiProperty } from '@nestjs/swagger';
import {
  EntityId,
  IValidateWebsiteOptionsDto,
  SubmissionId,
} from '@postybirb/types';
import { IsString } from 'class-validator';

export class ValidateWebsiteOptionsDto implements IValidateWebsiteOptionsDto {
  @ApiProperty()
  @IsString()
  submissionId: SubmissionId;

  @ApiProperty()
  @IsString()
  websiteOptionId: EntityId;
}
