import { AccountId, ILoginState } from '@postybirb/types';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { LoginStatePoller } from './login-state-poller';

function createInstance(accountId: AccountId, state: ILoginState) {
  return {
    accountId,
    getLoginState: jest.fn(() => state),
  } as unknown as UnknownWebsite;
}

describe('LoginStatePoller', () => {
  const idleState: ILoginState = {
    status: 'idle',
    isLoggedIn: false,
    pending: false,
    username: null,
    lastUpdated: null,
  };

  it('should report only changed and disappeared account ids', () => {
    const accountA = createInstance('account-a', idleState);
    const accountB = createInstance('account-b', idleState);
    let instances = [accountA, accountB];
    const registry = {
      getAll: jest.fn(() => instances),
    } as unknown as WebsiteRegistryService;
    const onStateChange = jest.fn();
    const poller = new LoginStatePoller(registry, onStateChange);

    poller.checkForChanges();
    expect(onStateChange).toHaveBeenLastCalledWith([
      'account-a',
      'account-b',
    ]);

    onStateChange.mockClear();
    poller.checkForChanges();
    expect(onStateChange).not.toHaveBeenCalled();

    accountA.getLoginState = jest.fn(() => ({
      ...idleState,
      status: 'loggedIn',
      isLoggedIn: true,
      username: 'User',
    }));
    poller.checkForChanges();
    expect(onStateChange).toHaveBeenLastCalledWith(['account-a']);

    onStateChange.mockClear();
    instances = [accountA];
    poller.checkForChanges();
    expect(onStateChange).toHaveBeenLastCalledWith(['account-b']);
  });

  it('should report one account from checkInstance only when changed', () => {
    const instance = createInstance('account-a', idleState);
    const registry = { getAll: jest.fn() } as unknown as WebsiteRegistryService;
    const onStateChange = jest.fn();
    const poller = new LoginStatePoller(registry, onStateChange);

    poller.checkInstance(instance);
    expect(onStateChange).toHaveBeenLastCalledWith(['account-a']);

    onStateChange.mockClear();
    poller.checkInstance(instance);
    expect(onStateChange).not.toHaveBeenCalled();
  });
});