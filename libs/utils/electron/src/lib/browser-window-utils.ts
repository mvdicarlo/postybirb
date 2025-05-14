import { BrowserWindow } from 'electron';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createWindow(partition: string, url: string) {
  const bw: Electron.BrowserWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: `persist:${partition}`,
    },
  });

  try {
    await bw.loadURL(url);
  } catch (err) {
    bw.destroy();
    throw err;
  }

  return bw;
}

export class BrowserWindowUtils {
  static async getLocalStorage<T = object>(
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
}
