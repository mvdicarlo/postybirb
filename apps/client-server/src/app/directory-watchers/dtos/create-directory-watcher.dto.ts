import { ApiProperty } from '@nestjs/swagger';
import { ICreateDirectoryWatcherDto } from '@postybirb/dto';
import { DirectoryWatcherImportAction } from '@postybirb/types';
import { IsEnum, IsString } from 'class-validator';

export class CreateDirectoryWatcherDto implements ICreateDirectoryWatcherDto {
  @ApiProperty()
  @IsString()
  path: string;

  @ApiProperty()
  @IsEnum(DirectoryWatcherImportAction)
  importAction: DirectoryWatcherImportAction;
}
