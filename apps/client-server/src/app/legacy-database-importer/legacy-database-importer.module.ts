import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { FileModule } from '../file/file.module';
import { SubmissionModule } from '../submission/submission.module';
import { LegacyDatabaseImporterController } from './legacy-database-importer.controller';
import { LegacyDatabaseImporterService } from './legacy-database-importer.service';

@Module({
  imports: [AccountModule, FileModule, SubmissionModule],
  providers: [LegacyDatabaseImporterService],
  controllers: [LegacyDatabaseImporterController],
  exports: [],
})
export class LegacyDatabaseImporterModule {}
