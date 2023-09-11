import { ApiProperty } from '@nestjs/swagger';
import {
  IUpdateSubmissionTemplateDto,
  IWebsiteFormFields,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateSubmissionTemplateDto
  implements IUpdateSubmissionTemplateDto
{
  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  options: WebsiteOptionsDto<IWebsiteFormFields>[];
}
