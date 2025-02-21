import { ApiProperty } from '@nestjs/swagger';
import {
  EntityId,
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
  remove?: EntityId[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  add?: ICreateWebsiteOptionsDto[];
}
