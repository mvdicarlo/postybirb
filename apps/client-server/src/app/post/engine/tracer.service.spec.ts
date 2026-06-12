import {
    mkdir,
    rm,
    stat,
    utimes,
    writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RelayTracer } from './tracer.service';

describe('RelayTracer memory + disk hygiene', () => {
  it('keeps per-job buffers isolated so a busy job cannot evict another', () => {
    const tracer = new RelayTracer();

    // Job B records one meaningful ledger entry.
    tracer.emit({ jobId: 'B', level: 'info', event: 'unit.posted' });

    // Job A floods the tracer with thousands of entries.
    for (let i = 0; i < 5000; i++) {
      tracer.emit({ jobId: 'A', level: 'debug', event: 'stage.ok' });
    }

    // B's entry survives despite A's flood (no cross-job eviction).
    expect(tracer.getEntries('B')).toHaveLength(1);
    expect(tracer.getLedger('B')).toHaveLength(1);

    // A is bounded to its per-job cap (2000), not unbounded.
    expect(tracer.getEntries('A').length).toBeLessThanOrEqual(2000);
  });

  it('evicts the oldest job buffers once the job cap is exceeded', () => {
    const tracer = new RelayTracer();
    // Cap is 200 jobs; emit for 250 distinct jobs.
    for (let i = 0; i < 250; i++) {
      tracer.emit({ jobId: `job_${i}`, level: 'info', event: 'task.started' });
    }
    // The earliest jobs are evicted from memory...
    expect(tracer.getEntries('job_0')).toHaveLength(0);
    // ...while the most recent are retained.
    expect(tracer.getEntries('job_249')).toHaveLength(1);
  });

  it('prunes on-disk NDJSON logs older than the retention window', async () => {
    const tracer = new RelayTracer();
    const dir = dirname(tracer.getLogPath('x'));
    await mkdir(dir, { recursive: true });

    const oldPath = join(dir, 'old-job.ndjson');
    const newPath = join(dir, 'new-job.ndjson');
    await writeFile(oldPath, '{}\n');
    await writeFile(newPath, '{}\n');

    // Backdate the old file ~40 days.
    const old = Date.now() / 1000 - 40 * 24 * 60 * 60;
    await utimes(oldPath, old, old);

    const deleted = await tracer.pruneOldLogs(30 * 24 * 60 * 60 * 1000, 1000);

    expect(deleted).toBeGreaterThanOrEqual(1);
    await expect(stat(oldPath)).rejects.toBeDefined(); // removed
    await expect(stat(newPath)).resolves.toBeDefined(); // kept

    // Cleanup the file we created.
    await rm(newPath, { force: true });
  });
});
