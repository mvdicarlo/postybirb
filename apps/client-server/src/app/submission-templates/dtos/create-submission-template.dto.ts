import { ApiProperty } from '@nestjs/swagger';
import { ICreateSubmissionTemplateDto, SubmissionType } from '@postybirb/types';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { CreateWebsiteOptionsDto } from '../../website-options/dtos/create-website-options.dto';

export class CreateSubmissionTemplateDto
  implements ICreateSubmissionTemplateDto
{
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  options: CreateWebsiteOptionsDto[];
}
