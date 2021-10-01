import { Logger } from '@nestjs/common';
import {
  readJson,
  removeFile,
  writeJson,
  PostyBirbDirectories,
} from '@postybirb/fs';
import { join } from 'path';

const { WEBSITE_DATA_DIRECTORY } = PostyBirbDirectories;

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

  private async loadData() {
    let data: T = {} as T;
    try {
      data = await readJson<T>(this.path);
    } catch {
      // Ignore
    }

    this.data = data;
  }

  private async saveData() {
    await writeJson(this.path, this.data);
  }

  public async initialize() {
    if (!this.initialized) {
      this.initialized = true;
      await this.loadData();
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async clearData() {
    this.logger.log('Clearing website data');
    this.data = {} as T;
    try {
      await removeFile(this.path);
    } catch (err) {
      this.logger.warn(err.message);
    }
  }

  public getData(): T {
    return { ...this.data };
  }

  public async setData(data: T) {
    if (JSON.stringify(data) !== JSON.stringify(this.data)) {
      this.data = { ...data };
      await this.saveData();
    }
  }
}
