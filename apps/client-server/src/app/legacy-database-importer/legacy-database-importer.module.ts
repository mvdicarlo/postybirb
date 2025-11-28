import { Module } from '@nestjs/common';
import { LegacyDatabaseImporterService } from './legacy-database-importer.service';

@Module({
  imports: [],
  providers: [LegacyDatabaseImporterService],
  controllers: [],
  exports: [],
})
export class LegacyDatabaseImporterModule {}
