import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionTemplateDto } from '@postybirb/types';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateWebsiteOptionsDto } from '../../website-options/dtos/create-website-options.dto';

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
  options: CreateWebsiteOptionsDto[];
}
