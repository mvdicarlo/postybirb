import { ApiProperty } from '@nestjs/swagger';
import { IUpdateSubmissionTemplateNameDto } from '@postybirb/types';
import { IsString } from 'class-validator';

export class UpdateSubmissionTemplateNameDto
  implements IUpdateSubmissionTemplateNameDto
{
  @ApiProperty()
  @IsString()
  name: string;
}
