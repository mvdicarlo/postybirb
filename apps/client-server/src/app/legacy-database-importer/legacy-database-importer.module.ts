import { Module } from '@nestjs/common';
import { LegacyDatabaseImporterController } from './legacy-database-importer.controller';
import { LegacyDatabaseImporterService } from './legacy-database-importer.service';

@Module({
  imports: [],
  providers: [LegacyDatabaseImporterService],
  controllers: [LegacyDatabaseImporterController],
  exports: [],
})
export class LegacyDatabaseImporterModule {}
