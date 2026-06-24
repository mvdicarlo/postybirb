import { NodeStatus } from '@postybirb/types';
import {
    RelayJob,
    RelayTask,
    computeJobStatus,
    evaluateDependency,
} from './model';

function task(id: string, dependency?: RelayTask['dependency']): RelayTask {
  return new RelayTask({
    id,
    jobId: 'j',
    accountId: 'a',
    websiteId: 'w',
    idempotencyKey: id,
    dependency,
  });
}

describe('Relay model — dependency evaluation', () => {
  function jobWith(tasks: RelayTask[]): RelayJob {
    const job = new RelayJob({ submissionId: 's' });
    job.tasks.push(...tasks);
    return job;
  }

  it('any/all/count gating progresses with upstream successes', () => {
    const up1 = task('up1');
    const up2 = task('up2');
    const up3 = task('up3');
    const ids = ['up1', 'up2', 'up3'];
    const anyT = task('any', { mode: 'any', tasks: ids });
    const allT = task('all', { mode: 'all', tasks: ids });
    const cntT = task('cnt', { mode: 'count', tasks: ids, n: 2 });
    const job = jobWith([up1, up2, up3, anyT, allT, cntT]);

    expect(evaluateDependency(job, anyT)).toBe('pending');
    expect(evaluateDependency(job, allT)).toBe('pending');
    expect(evaluateDependency(job, cntT)).toBe('pending');

    up1.status = NodeStatus.SUCCEEDED;
    expect(evaluateDependency(job, anyT)).toBe('satisfied');
    expect(evaluateDependency(job, cntT)).toBe('pending');
    expect(evaluateDependency(job, allT)).toBe('pending');

    up2.status = NodeStatus.SUCCEEDED;
    expect(evaluateDependency(job, cntT)).toBe('satisfied');
    expect(evaluateDependency(job, allT)).toBe('pending');

    up3.status = NodeStatus.SKIPPED;
    expect(evaluateDependency(job, allT)).toBe('satisfied');
  });

  it('resolves unreachable gates to blocked', () => {
    const up1 = task('u1');
    const up2 = task('u2');
    const cnt = task('c', { mode: 'count', tasks: ['u1', 'u2'], n: 2 });
    const allT = task('a', { mode: 'all', tasks: ['u1', 'u2'] });
    const job = jobWith([up1, up2, cnt, allT]);

    up1.status = NodeStatus.SUCCEEDED;
    up2.status = NodeStatus.FAILED;
    expect(evaluateDependency(job, cnt)).toBe('blocked');
    expect(evaluateDependency(job, allT)).toBe('blocked');
  });

  it('allSettled waits for all to settle then satisfies, never blocked', () => {
    const up1 = task('s1');
    const up2 = task('s2');
    const settled = task('settled', { mode: 'allSettled', tasks: ['s1', 's2'] });
    const job = jobWith([up1, up2, settled]);

    expect(evaluateDependency(job, settled)).toBe('pending');

    up1.status = NodeStatus.SUCCEEDED;
    expect(evaluateDependency(job, settled)).toBe('pending'); // s2 not terminal

    // Both terminal now — best-effort satisfies despite the failure (a strict
    // 'all' would report 'blocked' here).
    up2.status = NodeStatus.FAILED;
    expect(evaluateDependency(job, settled)).toBe('satisfied');
  });

  it('treats no dependency as none', () => {
    const t = task('t');
    const job = jobWith([t]);
    expect(evaluateDependency(job, t)).toBe('none');
  });
});

describe('Relay model — computeJobStatus', () => {
  it('is SUCCEEDED only when all tasks are terminal-done', () => {
    const job = new RelayJob({ submissionId: 's' });
    const a = task('a');
    const b = task('b');
    job.tasks.push(a, b);

    a.status = NodeStatus.SUCCEEDED;
    b.status = NodeStatus.RUNNING;
    expect(computeJobStatus(job)).toBe(NodeStatus.RUNNING);

    b.status = NodeStatus.SUCCEEDED;
    expect(computeJobStatus(job)).toBe(NodeStatus.SUCCEEDED);

    b.status = NodeStatus.FAILED;
    expect(computeJobStatus(job)).toBe(NodeStatus.FAILED);
  });
});
