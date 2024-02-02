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
  })
  @IsEnum(DirectoryWatcherImportAction)
  importAction: DirectoryWatcherImportAction;

  @ApiProperty()
  @IsString()
  path: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  template?: SubmissionId;
}
