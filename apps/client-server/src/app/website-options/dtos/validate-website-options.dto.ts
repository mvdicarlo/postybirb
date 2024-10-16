import { ApiProperty } from '@nestjs/swagger';
import { IValidateWebsiteOptionsDto } from '@postybirb/types';
import { IsString } from 'class-validator';

export class ValidateWebsiteOptionsDto implements IValidateWebsiteOptionsDto {
  @ApiProperty()
  @IsString()
  submission: string;

  @ApiProperty()
  @IsString()
  websiteOptionId: string;
}
