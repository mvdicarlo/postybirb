import { Injectable } from '@nestjs/common';
import { PlatformNetworkService } from '@postybirb/platform';
import { net } from 'electron';

/**
 * Electron-backed implementation of {@link PlatformNetworkService}.
 *
 * Routes through Electron's `net` module which uses the Chromium network
 * stack (and therefore inherits its proxy configuration).
 */
@Injectable()
export class ElectronNetworkService extends PlatformNetworkService {
  isOnline(): boolean {
    return net.isOnline();
  }

  fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    return net.fetch(input.toString(), init);
  }
}
