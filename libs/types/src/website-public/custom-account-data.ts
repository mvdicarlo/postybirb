export interface CustomAccountData {
  descriptionField?: string;
  descriptionType?: 'html' | 'text' | 'md' | 'bbcode';
  fileField?: string;
  fileUrl?: string;
  headers: { name: string; value: string }[];
  notificationUrl?: string;
  ratingField?: string;
  sourceUrlsField?: string;
  tagField?: string;
  thumbnailField?: string;
  titleField?: string;
  altTextField?: string;
  fileBatchLimit?: number;
}
