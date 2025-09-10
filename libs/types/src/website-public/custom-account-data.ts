export interface CustomAccountData {
  descriptionField?: string;
  descriptionType?: 'html' | 'text' | 'md' | 'bbcode';
  fileField?: string;
  fileUrl?: string;
  headers: { name: string; value: string }[];
  notificationUrl?: string;
  ratingField?: string;
  tagField?: string;
  thumbnaiField?: string;
  titleField?: string;
  altTextField?: string;
}
