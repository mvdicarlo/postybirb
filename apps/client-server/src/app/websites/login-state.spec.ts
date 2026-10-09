import { LoginState } from '@postybirb/types';

describe('LoginState (immutable value object)', () => {
  it('starts idle with no login info', () => {
    const state = LoginState.initial();
    expect(state.status).toBe('idle');
    expect(state.isLoggedIn).toBe(false);
    expect(state.pending).toBe(false);
    expect(state.username).toBeNull();
    expect(state.lastUpdated).toBeNull();
  });

  it('beginCheck marks checking, preserves username, and timestamps', () => {
    const loggedIn = LoginState.initial().resolve({
      loggedIn: true,
      username: 'alice',
    });
    const checking = loggedIn.beginCheck();

    expect(checking.status).toBe('checking');
    expect(checking.pending).toBe(true);
    expect(checking.isLoggedIn).toBe(false);
    // Username is preserved while re-checking.
    expect(checking.username).toBe('alice');
    expect(checking.lastUpdated).not.toBeNull();
  });

  it('resolve(loggedIn) transitions to loggedIn with username', () => {
    const state = LoginState.initial().resolve({
      loggedIn: true,
      username: 'bob',
    });
    expect(state.status).toBe('loggedIn');
    expect(state.isLoggedIn).toBe(true);
    expect(state.pending).toBe(false);
    expect(state.username).toBe('bob');
  });

  it('resolve(loggedOut) transitions to loggedOut and clears username', () => {
    const state = LoginState.initial()
      .resolve({ loggedIn: true, username: 'carol' })
      .resolve({ loggedIn: false });
    expect(state.status).toBe('loggedOut');
    expect(state.isLoggedIn).toBe(false);
    expect(state.username).toBeNull();
  });

  it('resolve(loggedIn) without username defaults to null', () => {
    const state = LoginState.initial().resolve({ loggedIn: true });
    expect(state.status).toBe('loggedIn');
    expect(state.username).toBeNull();
  });

  it('reset returns a loggedOut state with no username', () => {
    const state = LoginState.initial()
      .resolve({ loggedIn: true, username: 'dave' })
      .reset();
    expect(state.status).toBe('loggedOut');
    expect(state.isLoggedIn).toBe(false);
    expect(state.username).toBeNull();
  });

  it('is immutable: transitions return new frozen instances', () => {
    const initial = LoginState.initial();
    const checking = initial.beginCheck();

    expect(checking).not.toBe(initial);
    expect(initial.status).toBe('idle');
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(checking)).toBe(true);
  });

  it('toDTO returns a plain snapshot with derived fields', () => {
    const state = LoginState.initial().resolve({
      loggedIn: true,
      username: 'erin',
    });
    const dto = state.toDTO();

    expect(dto).not.toBeInstanceOf(LoginState);
    expect(dto).toEqual({
      status: 'loggedIn',
      isLoggedIn: true,
      username: 'erin',
      pending: false,
      lastUpdated: state.lastUpdated,
    });
  });
});
