/**
 * Relay engine — on-disk trace file locations + cleanup.
 *
 * Trace logs are one NDJSON file per job (`<jobId>.ndjson`) under the shared
 * post-traces directory. This module centralizes the path derivation and a
 * best-effort deletion helper so both the {@link RelayTracer} (which writes
 * them) and callers that remove jobs (e.g. submission deletion) resolve the
 * exact same location without pulling in the tracer's runtime dependencies.
 */

import { PostyBirbDirectories } from '@postybirb/fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

/** Directory holding per-job NDJSON trace files. */
export const POST_TRACE_DIR = join(
  PostyBirbDirectories.LOGS_DIRECTORY,
  'post-traces',
);

/** Absolute path to a job's NDJSON trace file (may not yet exist). */
export function tracePath(jobId: string): string {
  return join(POST_TRACE_DIR, `${jobId}.ndjson`);
}

/**
 * Delete the trace files for the given job ids. Best-effort: a missing file or
 * IO error is ignored (tracing must never break the caller). Returns the number
 * of files actually removed.
 */
export async function deleteTraceFiles(jobIds: string[]): Promise<number> {
  const results = await Promise.all(
    jobIds.map((id) => unlink(tracePath(id)).then(() => true, () => false)),
  );
  return results.filter(Boolean).length;
}
