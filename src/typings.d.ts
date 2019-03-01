declare var appVersion: string;
declare function closeAfterPost(): boolean; // flag letting the app know it was only opened to perform a scheduled post and to close once it finishes
declare var nativeImage: any; // electron nativeImage object
declare var store: any; //storejs
declare var descriptionTemplateDB: any; //lowDB instance
declare var templateDB: any; //lowDB instance
declare var profilesDB: any; //lowDB instance
declare var settingsDB: any; //lowDB instance
declare var loginPanel: any; // login panel hook inserted into window
declare var got: {
  get(url: string, cookieUrl: string, cookies: any[], profileId: string, options?: any): Promise<any>;
  patch(url: string, formData: any, cookieUrl: string, cookies: any[], options?: any): Promise<{ error?: any, success?: { body: any, response: any } }>;
  post(url: string, formData: any, cookieUrl: string, cookies: any[], options?: any): Promise<{ error?: any, success?: { body: any, response: any } }>;
}

declare function openUrlInBrowser(url: string): void;
declare function getCookies(persistId: string, url: string): Promise<any[]>;
declare function getCookieAPI(persistId: string): any;
declare function getFileIcon(path: string, opts: any, callback: any): any;
declare function getClipboardFormats(): any;
declare function readClipboard(): any;
declare function writeToClipboard(data: any): void;
declare function writeJsonToFile(fileName: string, data: any): void;
declare function relaunch(): void;
declare var BrowserWindow: any; // Electron BrowserWindow
