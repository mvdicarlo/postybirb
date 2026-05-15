export interface PlatformNotificationOptions {
  title: string;
  body: string;
  /** Optional silent flag - implementations may ignore. */
  silent?: boolean;
}

/**
 * OS-level desktop notifications. Implementations may no-op when the
 * runtime cannot display notifications (headless, unsupported platforms).
 */
export abstract class PlatformNotificationService {
  /** Returns true when desktop notifications can actually be shown. */
  abstract isSupported(): boolean;

  /** Shows a desktop notification. No-ops when {@link isSupported} is false. */
  abstract show(options: PlatformNotificationOptions): void;
}
