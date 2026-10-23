import { LegacyImportDto } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

export interface LegacyImportResponse {
  errors: { message: string }[];
}

class LegacyDatabaseImporterApi {
  protected readonly client: HttpClient;

  constructor() {
    this.client = new HttpClient('legacy-database-importer');
  }

  public import(importRequest: LegacyImportDto) {
    return this.client.post<LegacyImportResponse>('import', importRequest);
  }
}

export default new LegacyDatabaseImporterApi();
