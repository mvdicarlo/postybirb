import { Logger } from '@nestjs/common';
import { WEBSITE_DATA_DIRECTORY } from '../data-storage/data-storage-directories';
import {
  readJsonSync,
  removeFileSync,
  writeJsonSync,
} from '../data-storage/data-storage.util';
import { join } from 'path';

export default class WebsiteData<T extends Record<string, unknown>> {
  private readonly logger: Logger;

  private readonly id: string;
  private data: T;
  private initialized: boolean;

  get path(): string {
    return join(WEBSITE_DATA_DIRECTORY, `${this.id}.json`);
  }

  constructor(id: string) {
    this.logger = new Logger(`WebsiteData[${id}]`);
    this.id = id;
    this.initialized = false;
  }

  private loadData() {
    let data: T = {} as T;
    try {
      data = readJsonSync<T>(this.path);
    } catch {
      // Ignore
    }

    this.data = data;
  }

  private saveData() {
    writeJsonSync(this.path, this.data);
  }

  public initialize() {
    if (!this.initialized) {
      this.initialized = true;
      this.loadData();
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public clearData() {
    this.logger.log('Clearing website data');
    this.data = {} as T;
    removeFileSync(this.path);
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
