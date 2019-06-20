export class BrowserWindowHelper {
  /**
   * Opens a BrowserWindow to a url and then closes it. May be useful for refreshing cookies.
   * @param  profileId      login profile id
   * @param  url            url to load
   */
  public static hitUrl(profileId: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      const win = BrowserWindowHelper.createWindow(profileId, url);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          resolve();
          return;
        }

        win.destroy();
        resolve();
      });
    });
  }

  /**
   * Retrieves FormData as an Object from a webpage
   * @param  profileId      login profile id
   * @param  url            url to load
   * @param  selector       how to retrieve the form element
   * @return                form data as Object
   */
  public static retrieveFormData(profileId: string, url: string, selector: { id?: string, selectorString?: string }): Promise<any> {
    return new Promise((resolve, reject) => {
      const win = BrowserWindowHelper.createWindow(profileId, url);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          reject(new Error(`Browser Window for ${url} was already destroyed.`));
          return;
        }

        let retrievalString: string = '';
        if (selector.id) {
          retrievalString = `Array.from(new FormData(document.getElementById('${selector.id}'))).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})`;
        } else {
          retrievalString = `Array.from(new FormData(${selector.selectorString})).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})`;
        }

        win.webContents.executeJavaScript(retrievalString)
          .then(formData => resolve(formData))
          .catch(err => reject(err))
          .finally(() => win.destroy());
      });
    });
  }

  /**
   * Runs a script inside a BrowserWindow and returns the result
   * @param  profileId      login profile id
   * @param  url            url to load
   * @return                 result of script
   */
  public static runScript<T>(profileId: string, url: string, script: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const win = BrowserWindowHelper.createWindow(profileId, url);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          reject(new Error(`Browser Window for ${url} was already destroyed.`));
          return;
        }

        win.webContents.executeJavaScript(script)
          .then(value => resolve(value))
          .catch(err => reject(err))
          .finally(() => win.destroy());
      });
    });
  }

  private static createWindow(profileId: string, url: string): any /*BrowserWindow*/ {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: `persist:${profileId}`
      }
    });

    win.loadURL(url);
    return win;
  }
}
