/**
 * Dependency-tree helpers for the post-confirm modal.
 *
 * Builds a forest from the flat set of in-batch submissions using their
 * `metadata.dependsOn` relations, where a prerequisite is the PARENT and the
 * submissions that declare it nest beneath it as children (e.g. comic Page 1 is
 * the parent of Pages 2 & 3). Only in-batch prerequisites create nesting; the
 * flattened order posts a parent before its children (prerequisite-first),
 * which the engine also enforces independently via success-gating.
 */

import type { SubmissionRecord } from '../../../../stores/records';

export interface DependencyNode {
  submission: SubmissionRecord;
  /** Dependents of this submission, nested beneath it. */
  children: DependencyNode[];
  /** The prerequisite (parent) submission id this node nests under, or null. */
  parentId: string | null;
  /**
   * Ancestor submission ids from the nearest parent up to the root (all
   * in-batch). Any of these prerequisites is already implied by nesting, so the
   * row need not repeat them as "waits for" chips.
   */
  ancestorIds: string[];
}

/**
 * Build a dependency forest from a flat list of in-batch submissions.
 *
 * Nesting rules (each node appears exactly once):
 *  - 0 in-batch prerequisites -> top-level root.
 *  - 1 in-batch prerequisite -> nested under it.
 *  - 2+ in-batch prerequisites that form a chain (one transitively depends on
 *    the others) -> nested under the DEEPEST one, so a chain like
 *    a <- b <- c(deps a,b) still nests c under b under a.
 *  - 2+ independent in-batch prerequisites (a diamond, neither covers the
 *    other) -> hoisted to a top-level root; its prerequisites still show as
 *    "waits for" chips.
 *
 * Recursion is arbitrary depth. A cycle guard hoists any node that would
 * otherwise be its own ancestor, so malformed `dependsOn` data can't loop.
 */
export function buildDependencyForest(
  submissions: SubmissionRecord[],
): DependencyNode[] {
  const inBatch = new Set(submissions.map((s) => s.id));
  const byId = new Map(submissions.map((s) => [s.id, s]));
  const inBatchPrereqs = (s: SubmissionRecord): string[] =>
    (s.metadata?.dependsOn ?? []).filter((id) => inBatch.has(id));

  // All in-batch prerequisites reachable from a node (transitive closure),
  // memoized and cycle-safe via an iterative DFS with a visited set.
  const transitiveCache = new Map<string, Set<string>>();
  const transitivePrereqs = (id: string): Set<string> => {
    const cached = transitiveCache.get(id);
    if (cached) return cached;
    const result = new Set<string>();
    const visited = new Set<string>([id]);
    const stack = [...inBatchPrereqs(byId.get(id) as SubmissionRecord)];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      if (visited.has(cur)) continue;
      visited.add(cur);
      result.add(cur);
      const s = byId.get(cur);
      if (s) {
        for (const p of inBatchPrereqs(s)) if (!visited.has(p)) stack.push(p);
      }
    }
    transitiveCache.set(id, result);
    return result;
  };

  // Choose a single parent per node. When several prerequisites are in-batch,
  // pick the one that transitively depends on all the others (the deepest link
  // in a chain); if none covers the rest, the node is hoisted (parent = null).
  const parentOf = new Map<string, string | null>();
  for (const s of submissions) {
    const prereqs = inBatchPrereqs(s);
    if (prereqs.length === 0) {
      parentOf.set(s.id, null);
    } else if (prereqs.length === 1) {
      parentOf.set(s.id, prereqs[0]);
    } else {
      const deepest = prereqs.find((p) => {
        const tp = transitivePrereqs(p);
        return prereqs.every((q) => q === p || tp.has(q));
      });
      parentOf.set(s.id, deepest ?? null);
    }
  }

  // Break cycles: hoist any node that reaches itself by walking parents.
  const reachesSelf = (startId: string): boolean => {
    const seen = new Set<string>();
    let cur = parentOf.get(startId) ?? null;
    while (cur) {
      if (cur === startId) return true;
      if (seen.has(cur)) return false;
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
    return false;
  };
  for (const s of submissions) {
    if (parentOf.get(s.id) && reachesSelf(s.id)) parentOf.set(s.id, null);
  }

  const nodeById = new Map<string, DependencyNode>(
    submissions.map((s) => [
      s.id,
      {
        submission: s,
        children: [],
        parentId: parentOf.get(s.id) ?? null,
        ancestorIds: [],
      },
    ]),
  );

  const roots: DependencyNode[] = [];
  for (const s of submissions) {
    const node = nodeById.get(s.id) as DependencyNode;
    const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      node.parentId = null;
      roots.push(node);
    }
  }

  // Record each node's ancestor chain (nearest parent first) for chip filtering.
  const assignAncestors = (node: DependencyNode, ancestors: string[]): void => {
    node.ancestorIds = ancestors;
    const next = [node.submission.id, ...ancestors];
    for (const child of node.children) assignAncestors(child, next);
  };
  for (const root of roots) assignAncestors(root, []);

  return roots;
}

/**
 * Flatten the forest to a prerequisite-first ordering (pre-order DFS: each node
 * before its children). Used to build the enqueue order.
 */
export function flattenForest(forest: DependencyNode[]): SubmissionRecord[] {
  const out: SubmissionRecord[] = [];
  const walk = (nodes: DependencyNode[]): void => {
    for (const node of nodes) {
      out.push(node.submission);
      walk(node.children);
    }
  };
  walk(forest);
  return out;
}

/**
 * Return a new forest with one sibling group replaced by `newNodes`. A null
 * `parentId` targets the top-level roots; otherwise the children of the node
 * with that id are replaced. Used to commit a same-group reorder.
 */
export function reorderForestGroup(
  forest: DependencyNode[],
  parentId: string | null,
  newNodes: DependencyNode[],
): DependencyNode[] {
  if (parentId === null) return newNodes;
  const map = (nodes: DependencyNode[]): DependencyNode[] =>
    nodes.map((node) =>
      node.submission.id === parentId
        ? { ...node, children: newNodes }
        : { ...node, children: map(node.children) },
    );
  return map(forest);
}
