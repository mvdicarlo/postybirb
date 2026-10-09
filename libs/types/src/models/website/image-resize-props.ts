export type ImageResizeProps = {
  width?: number;
  height?: number;
  maxBytes?: number;
  allowQualityLoss?: boolean;
  /**
   * If set, convert the image to this MIME type (e.g., 'image/jpeg', 'image/png').
   * Uses sharp for conversion during the resize pass.
   */
  outputMimeType?: string;
};
