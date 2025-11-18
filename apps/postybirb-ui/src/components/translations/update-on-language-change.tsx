import { useLingui } from '@lingui/react';
import React from 'react';

/**
 * Mostly used with moment fromNow and format functions because they don't update text when language changes by itself
 */
export function UpdateOnLanguageChange({
  render,
}: {
  render: () => React.ReactNode;
}) {
  useLingui();
  return render();
}
