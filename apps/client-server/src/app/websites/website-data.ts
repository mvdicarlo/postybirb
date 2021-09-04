import { Logger } from '@nestjs/common';
import { WEBSITE_DATA_DIRECTORY } from '../data-storage/data-storage-directories';
import { readJsonSync, writeJsonSync } from '../data-storage/data-storage.util';
import { join } from 'path';

const FILE_ENCODING = 'binary';

export default class WebsiteData<T extends Record<string, unknown>> {
  private readonly logger: Logger;

  private readonly id: string;
  private readonly path: string;
  private data: T;

  constructor(id: string) {
    this.logger = new Logger(`WebsiteData[${id}]`);
    this.id = id;
    this.path = join(WEBSITE_DATA_DIRECTORY, `${id}.json`);
    this.loadData();
  }

  private loadData() {
    let data: T = {} as T;
    try {
      data = readJsonSync<T>(this.path, FILE_ENCODING);
    } catch {
      // Ignore
    }

    this.data = data;
  }

  private saveData() {
    writeJsonSync(this.path, this.data, FILE_ENCODING);
  }

  // TODO delete file
  public clearData() {
    this.logger.log('Clearing website data');
    this.data = {} as T;
    this.saveData();
  }

  public getData(): T {
    return { ...this.data };
  }

  public setData(data: T) {
    if (JSON.stringify(data) !== JSON.stringify(this.data)) {
      this.data = { ...data };
      this.saveData();
    }
  }
}
