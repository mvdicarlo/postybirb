import { ApiProperty } from '@nestjs/swagger';
import { IUpdateDirectoryWatcherDto } from '@postybirb/dto';
import { DirectoryWatcherImportAction } from '@postybirb/types';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateDirectoryWatcherDto implements IUpdateDirectoryWatcherDto {
  @ApiProperty()
  @IsString()
  id: string;

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
