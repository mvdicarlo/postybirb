import { ApiProperty } from '@nestjs/swagger';
import { IValidateSubmissionOptionsDto } from '@postybirb/dto';
import { IBaseWebsiteOptions } from '@postybirb/types';
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
  options: IBaseWebsiteOptions;

  @ApiProperty({ type: Object })
  @IsObject()
  defaultOptions: IBaseWebsiteOptions;
}
