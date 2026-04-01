/**
 * FieldCopyButton - Copy to clipboard button for text fields.
 * Re-exports CopyToClipboard for backwards compatibility.
 */

import { CopyToClipboard } from '../../../../../../shared/copy-to-clipboard';

export function FieldCopyButton({ value }: { value: string | undefined }) {
  return <CopyToClipboard value={value} variant="icon" size="sm" />;
}
