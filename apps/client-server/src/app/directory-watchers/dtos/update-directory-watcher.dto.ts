import { ApiProperty } from '@nestjs/swagger';
import {
  DirectoryWatcherImportAction,
  IUpdateDirectoryWatcherDto,
  SubmissionId,
} from '@postybirb/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateDirectoryWatcherDto implements IUpdateDirectoryWatcherDto {
  @ApiProperty({
    enum: DirectoryWatcherImportAction,
    required: false,
  })
  @IsOptional()
  @IsEnum(DirectoryWatcherImportAction)
  importAction?: DirectoryWatcherImportAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateId?: SubmissionId;
}
