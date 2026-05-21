import { Injectable } from '@nestjs/common';
import { PlatformAppService, PlatformPathName } from '@postybirb/platform';
import { app } from 'electron';
import { tmpdir } from 'os';

/**
 * Electron-backed implementation of {@link PlatformAppService}.
 */
@Injectable()
export class ElectronAppService extends PlatformAppService {
  getVersion(): string {
    return app.getVersion();
  }

  getPath(name: PlatformPathName): string {
    switch (name) {
      case 'userData':
        return app.getPath('userData');
      case 'documents':
        return app.getPath('documents');
      case 'home':
        return app.getPath('home');
      case 'logs':
        return app.getPath('logs');
      case 'temp':
        // Electron exposes temp via app.getPath('temp') as well, but tmpdir()
        // is identical and slightly cheaper.
        return tmpdir();
      default: {
        // Exhaustiveness check - if a new PlatformPathName is added without
        // updating this switch, TypeScript will flag it here.
        const exhaustive: never = name;
        throw new Error(`Unknown platform path: ${exhaustive}`);
      }
    }
  }

  quit(): void {
    app.quit();
  }
}
