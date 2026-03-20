import { Logger } from '@postybirb/logger';
import { AccountId, ILoginState } from '@postybirb/types';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';

/**
 * Compares all website instances' login states against a cached snapshot
 * and triggers a callback when any state has changed.
 *
 * Designed to be driven externally (e.g. by a @Cron job) rather than
 * managing its own polling interval.
 */
export class LoginStatePoller {
  private readonly logger = Logger(LoginStatePoller.name);

  /**
   * Cached snapshot of the last-known login state per account.
   * Used for diffing to detect changes.
   */
  private lastKnownStates: Record<AccountId, ILoginState> = {};

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly onStateChange: () => void,
  ) {}

  /**
   * Compare current login states against the cached snapshot.
   * If any account's state has changed, update the cache and fire the callback.
   */
  checkForChanges(): void {
    try {
      const instances = this.websiteRegistry.getAll();
      let hasChanged = false;

      const currentStates: Record<AccountId, ILoginState> = {};

      for (const instance of instances) {
        const { accountId } = instance;
        const state = instance.getLoginState();
        currentStates[accountId] = state;

        const previous = this.lastKnownStates[accountId];
        if (!previous || !this.statesEqual(previous, state)) {
          hasChanged = true;
        }
      }

      // Detect removed accounts
      for (const accountId of Object.keys(this.lastKnownStates)) {
        if (!(accountId in currentStates)) {
          hasChanged = true;
        }
      }

      if (hasChanged) {
        this.lastKnownStates = currentStates;
        this.onStateChange();
      }
    } catch (e) {
      this.logger.withError(e).error('Error during login state poll');
    }
  }

  /**
   * Check a single website instance for login state changes.
   * More efficient than checkForChanges() when you know exactly which instance changed.
   *
   * @param {UnknownWebsite} instance - The website instance to check
   */
  checkInstance(instance: UnknownWebsite): void {
    try {
      const { accountId } = instance;
      const state = instance.getLoginState();
      const previous = this.lastKnownStates[accountId];

      if (!previous || !this.statesEqual(previous, state)) {
        this.lastKnownStates[accountId] = state;
        this.onStateChange();
      }
    } catch (e) {
      this.logger.withError(e).error('Error during single instance login state check');
    }
  }

  /**
   * Shallow equality check for two ILoginState objects.
   */
  private statesEqual(a: ILoginState, b: ILoginState): boolean {
    return (
      a.isLoggedIn === b.isLoggedIn &&
      a.pending === b.pending &&
      a.username === b.username &&
      a.lastUpdated === b.lastUpdated
    );
  }
}
