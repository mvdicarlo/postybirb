import { ApiProperty } from '@nestjs/swagger';
import { IValidateSubmissionOptionsDto } from '@postybirb/dto';
import { BaseWebsiteOptions } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class ValidateSubmissionOptionsDto
  implements IValidateSubmissionOptionsDto
{
  @ApiProperty()
  @IsString()
  submissionId: string;

  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ type: Object })
  @IsObject()
  options: BaseWebsiteOptions;
}
