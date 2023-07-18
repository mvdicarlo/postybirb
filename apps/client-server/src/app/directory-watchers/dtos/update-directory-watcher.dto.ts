import { ApiProperty } from '@nestjs/swagger';
import {
  DirectoryWatcherImportAction,
  IUpdateDirectoryWatcherDto,
} from '@postybirb/types';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsArray()
  @IsOptional()
  submissionIds?: string[];
}
