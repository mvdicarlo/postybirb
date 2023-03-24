import { ApiProperty } from '@nestjs/swagger';
import { IUpdateDirectoryWatcherDto } from '@postybirb/dto';
import { DirectoryWatcherImportAction } from '@postybirb/types';
import { IsEnum, IsString } from 'class-validator';

export class UpdateDirectoryWatcherDto implements IUpdateDirectoryWatcherDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsEnum(DirectoryWatcherImportAction)
  importAction: DirectoryWatcherImportAction;

  @ApiProperty()
  @IsString()
  path: string;
}
