import { Logger } from '@postybirb/logger';
import { toError } from '@postybirb/utils/common';
import { app, session, shell } from 'electron';

/**
 * Centralised Electron security policies.
 *
 * The trust model has two tiers:
 *  - **Trusted**: PostyBirb's own UI, served from a loopback origin
 *    (https://localhost in production, http://localhost:4200 in dev).
 *  - **Untrusted**: third-party content loaded by login flows — `<webview>`
 *    elements and the hidden BrowserWindow used to read account localStorage.
 *
 * Trusted content gets full privileges; untrusted content is sandboxed, denied
 * popups, and denied dangerous device permissions, while still being free to
 * navigate (logins must reach arbitrary identity providers).
 */
const logger = Logger('Security');

/**
 * Device/automation permissions that must never be granted to untrusted
 * (remote) content. Benign permissions (e.g. clipboard, notifications) are
 * intentionally allowed so login pages keep working.
 */
const DENIED_REMOTE_PERMISSIONS = new Set<string>([
  'media',
  'geolocation',
  'hid',
  'serial',
  'usb',
  'midi',
  'midiSysex',
  'pointerLock',
  'keyboardLock',
  'idle-detection',
  'speaker-selection',
]);

/** True for URLs served by PostyBirb's own loopback server / dev server. */
export function isLoopbackAppUrl(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(value);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

/** True for links that are safe to hand to the OS via the default browser. */
export function isSafeExternalUrl(
  value: string | undefined | null,
): value is string {
  if (!value) {
    return false;
  }

  try {
    const { protocol } = new URL(value);
    return (
      protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
    );
  } catch {
    return false;
  }
}

/**
 * Open a URL in the user's default browser, but only if it uses a safe scheme.
 * Unsafe or malformed URLs are dropped (and logged) rather than forwarded to
 * the OS. Deferred via setImmediate so it never blocks a navigation decision.
 */
export function openExternalUrl(url: string): void {
  if (!isSafeExternalUrl(url)) {
    logger.warn(`Blocked attempt to open unsafe external URL: ${url}`);
    return;
  }

  setImmediate(() => {
    shell.openExternal(url).catch((error) => {
      logger
        .withError(toError(error))
        .warn(`Failed to open external URL: ${url}`);
    });
  });
}

function isPostyBirbCertificate(certificate: Electron.Certificate): boolean {
  return (
    certificate.issuerName === 'postybirb.com' &&
    certificate.subject.organizations?.[0] === 'PostyBirb' &&
    certificate.issuer.country === 'US'
  );
}

function applyPermissionPolicy(targetSession: Electron.Session): void {
  targetSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      if (isLoopbackAppUrl(details.requestingUrl)) {
        callback(true);
        return;
      }

      callback(!DENIED_REMOTE_PERMISSIONS.has(permission));
    },
  );

  targetSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin) => {
      if (isLoopbackAppUrl(requestingOrigin)) {
        return true;
      }

      return !DENIED_REMOTE_PERMISSIONS.has(permission);
    },
  );
}

/**
 * Harden the webContents that hosts the trusted PostyBirb UI (the main window):
 * block full-page navigations away from the app origin and divert any such
 * navigation to the user's browser. Applied to the main window ONLY — the
 * hidden localStorage window and `<webview>` login flows must navigate freely.
 */
export function hardenMainWindowWebContents(
  contents: Electron.WebContents,
): void {
  contents.on('will-navigate', (event, url) => {
    if (!isLoopbackAppUrl(url)) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });
}

/**
 * Install process-wide security policies. Must be called once, after the app is
 * ready and before any window is created.
 */
export function installAppSecurity(): void {
  // Deny popups everywhere and harden every <webview> that gets attached.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      openExternalUrl(url);
      return { action: 'deny' };
    });

    contents.on('will-attach-webview', (_e, webPreferences) => {
      // Login webviews must never run with a preload, Node integration, or a
      // shared (non-isolated) context. params.src is intentionally left
      // untouched so login flows can reach arbitrary identity providers.
      /* eslint-disable no-param-reassign */
      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      /* eslint-enable no-param-reassign */
    });
  });

  // Lock down permissions on every session (default + persisted partitions).
  app.on('session-created', (createdSession) => {
    applyPermissionPolicy(createdSession);
  });
  applyPermissionPolicy(session.defaultSession);

  // Accept PostyBirb's self-signed certificate for its own loopback HTTPS
  // server; reject every other certificate error.
  app.on(
    'certificate-error',
    (_event, _webContents, _url, _error, certificate, callback) => {
      callback(isPostyBirbCertificate(certificate));
    },
  );

  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    if (request.errorCode === 0) {
      callback(0);
      return;
    }

    callback(isPostyBirbCertificate(request.certificate) ? 0 : -2);
  });
}
