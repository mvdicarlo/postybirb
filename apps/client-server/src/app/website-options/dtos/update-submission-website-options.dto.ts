import { ApiProperty } from '@nestjs/swagger';
import {
    ICreateWebsiteOptionsDto,
    IUpdateSubmissionWebsiteOptionsDto,
} from '@postybirb/types';
import { IsArray, IsOptional } from 'class-validator';

export class UpdateSubmissionWebsiteOptionsDto
  implements IUpdateSubmissionWebsiteOptionsDto
{
  @ApiProperty()
  @IsOptional()
  @IsArray()
  remove?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  add?: Omit<ICreateWebsiteOptionsDto, 'id'>[];
}
