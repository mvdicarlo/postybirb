import { Injectable } from '@nestjs/common';
import { PlatformBrowserService } from '@postybirb/platform';
import { getPartitionKey } from '@postybirb/utils/common';
import { BrowserWindow } from 'electron';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createWindow(
  partition: string,
  url: string,
): Promise<Electron.BrowserWindow> {
  const bw = new BrowserWindow({
    show: false,
    webPreferences: { partition: getPartitionKey(partition) },
  });

  try {
    await bw.loadURL(url);
  } catch (err) {
    bw.destroy();
    throw err;
  }

  return bw;
}

/**
 * Electron-backed implementation of {@link PlatformBrowserService}. Drives a
 * hidden {@link BrowserWindow} with a per-partition session to let callers
 * read localStorage, ping URLs, or evaluate scripts against an authenticated
 * page.
 */
@Injectable()
export class ElectronBrowserService extends PlatformBrowserService {
  async getLocalStorage<T = Record<string, string>>(
    partition: string,
    url: string,
    wait?: number,
  ): Promise<T> {
    const bw = await createWindow(partition, url);
    try {
      if (wait) {
        await delay(wait);
      }
      return await bw.webContents.executeJavaScript(
        'JSON.parse(JSON.stringify(localStorage))',
      );
    } catch (err) {
      bw.destroy();
      throw err;
    } finally {
      if (!bw.isDestroyed()) {
        bw.destroy();
      }
    }
  }

  async runScriptOnPage<T>(
    partition: string,
    url: string,
    script: string,
    wait = 0,
    timeout = 60_000,
  ): Promise<T> {
    const bw = await createWindow(partition, url);
    try {
      if (wait) {
        await delay(wait);
      }

      // Using promise to handle errors. See more: https://github.com/electron/electron/pull/11158
      const page = await Promise.race([
        bw.webContents.executeJavaScript(`
      (function() {
        try {
          ${script}
        } catch (e) {
          return Promise.reject(e);
        }
      })()`),
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(new Error(`runScriptOnPage timed out after ${timeout}ms`)),
            timeout,
          );
        }),
      ]);
      return page;
    } catch (err) {
      const e = err as Error;
      if (e.message) {
        e.message = `Failed to run script on page: ${e.message}\n\nscript:\n${script}\n`;
      }

      bw.destroy();
      throw e;
    } finally {
      if (!bw.isDestroyed()) {
        bw.destroy();
      }
    }
  }

  async ping(partition: string, url: string): Promise<void> {
    const bw = await createWindow(partition, url);
    if (!bw.isDestroyed()) {
      bw.destroy();
    }
  }
}
