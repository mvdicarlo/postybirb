import { ApiProperty } from '@nestjs/swagger';
import { ICreateDirectoryWatcherDto } from '@postybirb/dto';
import { DirectoryWatcherImportAction } from '@postybirb/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateDirectoryWatcherDto implements ICreateDirectoryWatcherDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  path: string;

  @ApiProperty()
  @IsEnum(DirectoryWatcherImportAction)
  importAction: DirectoryWatcherImportAction;
}
