import { HttpClient } from '../transports/http-client';

export interface LegacyImportDto {
  customShortcuts: boolean;
  tagGroups: boolean;
  accounts: boolean;
  tagConverters: boolean;
  customPath?: string;
}

export interface LegacyImportResponse {
  errors: Error[];
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
