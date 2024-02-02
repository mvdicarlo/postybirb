import { ApiProperty } from '@nestjs/swagger';
import {
  DirectoryWatcherImportAction,
  ICreateDirectoryWatcherDto,
} from '@postybirb/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateDirectoryWatcherDto implements ICreateDirectoryWatcherDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  path: string;

  @ApiProperty({
    enum: DirectoryWatcherImportAction,
  })
  @IsEnum(DirectoryWatcherImportAction)
  importAction: DirectoryWatcherImportAction;
}
