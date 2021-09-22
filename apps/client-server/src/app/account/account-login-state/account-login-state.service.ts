import { Injectable, Logger, Optional } from '@nestjs/common';
import { ILoginState } from '../../websites/interfaces/login-state.interface';
import { UnknownWebsite } from '../../websites/website';
import { WSGateway } from '../../websocket/websocket.gateway';
import { AccountEvent } from '@postybirb/socket-events';
import { Account } from '../entities/account.entity';

type AccountLoginState = Record<
  string, // Account Id
  {
    state: ILoginState;
    /**
     * @todo protection filter to reduce sensitive data being sent on emit
     */
    data: Record<string, unknown>;
  }
>;

/**
 * Service responsible for tracking the login state of accounts.
 * Also emits socket events of updates.
 *
 * @todo extend ILoginState to have a pending state for UI usage
 * @class AccountLoginStateService
 */
@Injectable()
export class AccountLoginStateService {
  private readonly logger: Logger = new Logger(AccountLoginStateService.name);

  private readonly loginStates: AccountLoginState = {};

  constructor(@Optional() private readonly socket: WSGateway) {}

  public initializeLoginStates(accounts: Account[]) {
    accounts.forEach((account) => {
      this.loginStates[account.id] = {
        data: {},
        state: {
          isLoggedIn: false,
          username: null,
        },
      };
    });

    this.emit();
  }

  /**
   * Executes onLogin for passed in website.
   * Updates caches login state and data.
   *
   * @param {UnknownWebsite} website
   */
  public async executeOnLogin(website: UnknownWebsite) {
    this.logger.log(`Running onLogin on ${website.id}`);
    try {
      this.loginStates[website.accountId] = {
        state: await website.onLogin(),
        data: website.getWebsiteData(),
      };
    } catch (e) {
      this.loginStates[website.accountId] = {
        state: { isLoggedIn: false, username: null },
        data: website.getWebsiteData(),
      };
      if (e instanceof Error) {
        this.logger.error(
          `Website onLogin threw exception: ${e.message}`,
          e.stack
        );
      }
    } finally {
      this.emit();
    }
  }

  public getLoginStates(): AccountLoginState {
    return { ...this.loginStates };
  }

  private emit() {
    if (this.socket) {
      this.socket.emit(AccountEvent.ACCOUNT_LOGIN_UPDATES, {
        ...this.loginStates,
      });
    }
  }
}
