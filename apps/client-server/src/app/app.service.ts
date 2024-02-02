import { Injectable } from '@nestjs/common';
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
