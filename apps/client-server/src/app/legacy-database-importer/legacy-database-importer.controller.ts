import { Body, Controller, Post } from '@nestjs/common';
import { LegacyImportDto } from './dtos/legacy-import.dto';
import { LegacyDatabaseImporterService } from './legacy-database-importer.service';

@Controller('legacy-database-importer')
export class LegacyDatabaseImporterController {
  constructor(
    private readonly legacyDatabaseImporterService: LegacyDatabaseImporterService,
  ) {}

  @Post('import')
  async import(@Body() importRequest: LegacyImportDto) {
    return this.legacyDatabaseImporterService.import(importRequest);
  }
}
