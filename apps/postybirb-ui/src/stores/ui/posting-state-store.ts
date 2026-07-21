/**
 * Posting-state store (Relay engine).
 *
 * Single source of truth for live posting UI: a map of jobId -> JobTreeNode.
 * Seeded from `GET /post/jobs/active` on mount/reconnect and kept live by
 * POST_STATE_DELTA WebSocket events. Each delta is the same JobTreeNode shape
 * the UI renders, at job/task/unit granularity — a task/unit delta is merged
 * into its parent job subtree.
 *
 * Terminal jobs are pruned so the store only reflects active posting.
 */

import { POST_STATE_DELTA } from '@postybirb/socket-events';
import { JobTreeNode } from '@postybirb/types';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import postApi from '../../api/post.api';
import AppSocket from '../../transports/websocket';

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED']);

function isTerminal(node: JobTreeNode): boolean {
  return TERMINAL.has(node.status);
}

/** Replace a descendant node (by id) within a job tree, returning a new tree. */
function mergeNode(root: JobTreeNode, incoming: JobTreeNode): JobTreeNode {
  if (root.id === incoming.id) return incoming;
  if (!root.children?.length) return root;
  let changed = false;
  const children = root.children.map((child) => {
    const merged = mergeNode(child, incoming);
    if (merged !== child) changed = true;
    return merged;
  });
  return changed ? { ...root, children } : root;
}

interface PostingStateStore {
  /** jobId -> current job tree. */
  jobs: Record<string, JobTreeNode>;

  /** Apply a delta (job/task/unit JobTreeNode) from the WebSocket. */
  applyDelta: (node: JobTreeNode) => void;

  /** Replace the whole store from a snapshot. */
  setSnapshot: (trees: JobTreeNode[]) => void;

  /** Fetch the initial snapshot from the API. */
  fetchActive: () => Promise<void>;
}

/** Find the owning jobId for a delta node (job deltas carry their own id). */
function ownerJobId(jobs: Record<string, JobTreeNode>, node: JobTreeNode): string | undefined {
  if (node.kind === 'job') return node.id;
  // task/unit: locate the job whose subtree contains this id.
  for (const [jobId, tree] of Object.entries(jobs)) {
    if (containsId(tree, node.id)) return jobId;
  }
  return undefined;
}

function containsId(root: JobTreeNode, id: string): boolean {
  if (root.id === id) return true;
  return (root.children ?? []).some((c) => containsId(c, id));
}

const usePostingStateStore = create<PostingStateStore>((set, get) => ({
  jobs: {},

  applyDelta: (node) =>
    set((state) => {
      if (node.kind === 'job') {
        if (isTerminal(node)) {
          const { [node.id]: _removed, ...rest } = state.jobs;
          return { jobs: rest };
        }
        return { jobs: { ...state.jobs, [node.id]: node } };
      }
      const jobId = ownerJobId(state.jobs, node);
      if (!jobId) return state; // unknown job; snapshot will reconcile
      const tree = state.jobs[jobId];
      return { jobs: { ...state.jobs, [jobId]: mergeNode(tree, node) } };
    }),

  setSnapshot: (trees) =>
    set({
      jobs: Object.fromEntries(
        trees.filter((t) => !isTerminal(t)).map((t) => [t.id, t]),
      ),
    }),

  fetchActive: async () => {
    try {
      const response = await postApi.getActiveJobs();
      get().setSnapshot(response.body);
    } catch {
      // Non-critical; deltas will populate the store.
    }
  },
}));

AppSocket.on(POST_STATE_DELTA, (data: JobTreeNode) => {
  usePostingStateStore.getState().applyDelta(data);
});

/** All active job trees. */
export const useActiveJobs = (): JobTreeNode[] =>
  usePostingStateStore(useShallow((state) => Object.values(state.jobs)));

/** Set of submission ids that currently have an active (non-terminal) job. */
export const useActivePostingSubmissionIds = (): Set<string> =>
  usePostingStateStore(
    useShallow(
      (state) =>
        new Set(
          Object.values(state.jobs)
            .map((j) => j.submissionId)
            .filter((id): id is string => !!id),
        ),
    ),
  );

/** Whether a specific submission currently has an active job. */
export const useIsSubmissionPosting = (submissionId: string): boolean =>
  usePostingStateStore((state) =>
    Object.values(state.jobs).some((j) => j.submissionId === submissionId),
  );

/** The active job tree for a submission, if any. */
export const useSubmissionActiveJob = (
  submissionId: string,
): JobTreeNode | undefined =>
  usePostingStateStore(
    useShallow((state) =>
      Object.values(state.jobs).find((j) => j.submissionId === submissionId),
    ),
  );

/** Actions (fetch snapshot). */
export const usePostingStateActions = () =>
  usePostingStateStore(
    useShallow((state) => ({ fetchActive: state.fetchActive })),
  );

export default usePostingStateStore;
