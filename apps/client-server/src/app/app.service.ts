import { Injectable } from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { app } from 'electron';

@Injectable()
export class AppService {
  getData(): Record<string, string> {
    return {
      message: 'pong',
      version: app.getVersion(),
      location: app.getPath('appData'),
    };
  }
}
