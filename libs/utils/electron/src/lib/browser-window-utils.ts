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

  public static async runScriptOnPage<T>(
    partition: string,
    url: string,
    script: string,
    wait = 0,
  ): Promise<T> {
    const bw = await createWindow(partition, url);
    try {
      if (wait) {
        await delay(wait);
      }

      // Using promise to handle errors. See more: https://github.com/electron/electron/pull/11158
      const page = await bw.webContents.executeJavaScript(`
      (function() {
        try {
          ${script}
        } catch (e) {
          return Promise.reject(e);
        }
      })()`);
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

  public static async ping(partition: string, url: string): Promise<void> {
    const bw = await createWindow(partition, url);
    if (!bw.isDestroyed()) {
      bw.destroy();
    }
  }

  public static async getFormData(
    partition: string,
    url: string,
    selector: { id?: string; custom?: string },
  ): Promise<object> {
    const bw = await createWindow(partition, url);
    try {
      return await bw.webContents.executeJavaScript(
        `JSON.parse(JSON.stringify(Array.from(new FormData(${
          selector.id
            ? `document.getElementById('${selector.id}')`
            : selector.custom
        })).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})))`,
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
