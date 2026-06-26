/**
 * Relay engine — pipeline barrel.
 *
 * The pipeline is split into cohesive modules; this file preserves the
 * `./pipeline` import path and re-exports them:
 *   - {@link ./pipeline-deps.interface} — the {@link PipelineDeps} seam types.
 *   - {@link ./planner} — job planning + resume re-opening.
 *   - {@link ./task-pass} — the staged per-task pass (runTaskPass).
 */

export * from './pipeline-deps.interface';
export * from './planner';
export * from './task-pass';

