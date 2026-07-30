import { ConflictException, ExecutionContext } from '@nestjs/common';
import { PostingLockService } from '../../posting-lock/posting-lock.service';
import { NotWhilePostingGuard } from './not-while-posting.guard';

function contextFor(params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ params }) }),
  } as unknown as ExecutionContext;
}

function lockWith(isPostingLocked: (id: string) => boolean) {
  const lock = new PostingLockService();
  lock.setSource(isPostingLocked);
  return lock;
}

function guardWith(locked: boolean) {
  return new NotWhilePostingGuard(lockWith(() => locked));
}

describe('NotWhilePostingGuard', () => {
  it('allows the request when the submission is not posting', () => {
    expect(guardWith(false).canActivate(contextFor({ id: 's1' }))).toBe(true);
  });

  it('rejects the request when the submission is posting', () => {
    expect(() => guardWith(true).canActivate(contextFor({ id: 's1' }))).toThrow(
      ConflictException,
    );
  });

  it('passes the route submission id to the lock', () => {
    const isPostingLocked = jest.fn().mockReturnValue(false);
    const guard = new NotWhilePostingGuard(lockWith(isPostingLocked));

    guard.canActivate(contextFor({ id: 's1', fileId: 'f1' }));

    expect(isPostingLocked).toHaveBeenCalledWith('s1');
  });

  it('allows the request when the route carries no submission id', () => {
    // Guarding a route without an `:id` must not block every caller.
    const isPostingLocked = jest.fn().mockReturnValue(true);
    const guard = new NotWhilePostingGuard(lockWith(isPostingLocked));

    expect(guard.canActivate(contextFor({}))).toBe(true);
    expect(isPostingLocked).not.toHaveBeenCalled();
  });

  it('allows everything until the post engine registers itself', () => {
    // A module graph without the engine has nothing to conflict with.
    const guard = new NotWhilePostingGuard(new PostingLockService());

    expect(guard.canActivate(contextFor({ id: 's1' }))).toBe(true);
  });
});
