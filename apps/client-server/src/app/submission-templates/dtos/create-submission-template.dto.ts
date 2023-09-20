import { ApiProperty } from '@nestjs/swagger';
import { ICreateSubmissionTemplateDto, SubmissionType } from '@postybirb/types';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

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
}
