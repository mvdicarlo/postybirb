import { Injectable } from '@nestjs/common';
import { PlatformService } from '@postybirb/platform';

@Injectable()
export class AppService {
  constructor(private readonly platform: PlatformService) {}

  getData(): Record<string, string> {
    return {
      message: 'pong',
      version: this.platform.app.getVersion(),
      location: this.platform.app.getPath('userData'),
    };
  }
}
