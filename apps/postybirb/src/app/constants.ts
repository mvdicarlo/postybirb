export const rendererAppPort = 4200;

/**
 * Application User Model ID — must match electron-builder.yml `appId`. Set via
 * {@link Electron.App.setAppUserModelId} so Windows correctly groups the
 * taskbar entry and attributes notifications to PostyBirb.
 */
export const APP_USER_MODEL_ID = 'com.mvdicarlo.postybirb';

/** Default main-window dimensions (clamped to the work area at runtime). */
export const MAIN_WINDOW_DEFAULT_WIDTH = 1280;
export const MAIN_WINDOW_DEFAULT_HEIGHT = 720;

/**
 * Renderer crash-recovery throttle: reload the window at most
 * {@link RENDERER_MAX_RELOADS} times within {@link RENDERER_RELOAD_WINDOW_MS}
 * before giving up, so a renderer that crashes on load does not become a
 * reload loop.
 */
export const RENDERER_MAX_RELOADS = 3;
export const RENDERER_RELOAD_WINDOW_MS = 60_000;

/**
 * Centralised IPC channel names shared between the preload bridge and the main
 * process handlers. Kept as a plain const object so it can be safely bundled
 * into both the (sandboxed) preload bundle and the main bundle.
 */
export const IPC_CHANNELS = {
  // Synchronous metadata reads (a sandboxed preload cannot read process.env).
  getAppMetadata: 'get-app-metadata',
  getRemoteConfig: 'get-remote-config',

  // Asynchronous request/response.
  getLanIp: 'get-lan-ip',
  pickDirectory: 'pick-directory',
  getCookiesForAccount: 'get-cookies-for-account',
  getLocalStorageForAccount: 'get-local-storage-for-account',
  setSpellcheckerEnabled: 'set-spellchecker-enabled',
  setSpellcheckerLanguages: 'set-spellchecker-languages',
  getSpellcheckerLanguages: 'get-spellchecker-languages',
  getAllSpellcheckerLanguages: 'get-all-spellchecker-languages',
  getSpellcheckerWords: 'get-spellchecker-words',
  setSpellcheckerWords: 'set-spellchecker-words',

  // Fire-and-forget.
  openExternalLink: 'open-external-link',
  quit: 'quit',
} as const;

/** Shape returned by the {@link IPC_CHANNELS.getAppMetadata} channel. */
export type AppMetadata = {
  platform: NodeJS.Platform;
  app_port: string;
  app_version: string;
};
