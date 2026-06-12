/**
 * Relay  shared source-file shape used across the posting pipeline.engine 
 *
 * The actual file resizing/conversion is performed by {@link RelayFileProcessor}
 * (which delegates to PostFileResizerService + the sharp worker pool). This
 * module only carries the metadata type the pipeline threads through its stages.
 */

export type RelaySourceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  hash: string;
  altText?: string;
  dimensionOverrides?: Record<string, { width?: number; height?: number }>;
  /**
   * The raw source bytes. Required for real encoding/dispatch; optional so the
   * planner and unit tests can operate on metadata alone.
   */
  buffer?: Buffer;
};
