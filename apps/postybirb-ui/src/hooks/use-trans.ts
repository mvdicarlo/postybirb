import { useLingui } from '@lingui/react';

/**
 * Wrapper for {@link useLingui} hook.
 * Used to keep code style clean from lodash-like `_` variables
 */
export function useTrans() {
  const { _ } = useLingui();
  return _;
}

export type TransHook = ReturnType<typeof useTrans>;
