export type PatreonMediaState =
  | 'pending_upload'
  | 'processing'
  | 'ready'
  | 'failed';

export type PatreonMediaOwnerType = 'post' | 'user' | 'campaign';

export type PatreonMediaOwnerRelationship = 'main' | 'thumbnail' | 'attachment';

export type PatreonMediaType = 'image' | 'video' | 'audio';

export type PatreonMediaUploadAttributes = {
  state: PatreonMediaState;
  file_name: string;
  size_bytes: number;
  owner_id: string;
  owner_type: PatreonMediaOwnerType;
  owner_relationship: PatreonMediaOwnerRelationship;
  media_type: PatreonMediaType;
};

export type PatreonMediaUpload = {
  type: 'media';
  attributes: PatreonMediaUploadAttributes;
};

export type PatreonMediaUploadRequest = {
  data: PatreonMediaUpload;
};

// Response types
export type PatreonMediaUploadParameters = {
  acl: string;
  key: string;
  bucket: string;
  'X-Amz-Date': string;
  'X-Amz-Algorithm': string;
  'X-Amz-Credential': string;
  'X-Amz-Security-Token': string;
  policy: string;
  'X-Amz-Signature': string;
};

export type PatreonMediaImageUrls = {
  url: string;
  original: string;
  default: string;
  default_blurred: string;
  default_small: string;
  default_large: string;
  default_blurred_small: string;
  thumbnail: string;
  thumbnail_large: string;
  thumbnail_small: string;
};

export type PatreonMediaDimensions = {
  w: number;
  h: number;
};

export type PatreonMediaMetadata = {
  dimensions: PatreonMediaDimensions;
};

export type PatreonMediaDisplay = {
  url: string;
  state: PatreonMediaState;
  media_id: number;
};

export type PatreonMediaUploadResponseAttributes = {
  file_name: string;
  size_bytes: number;
  mimetype: string | null;
  state: PatreonMediaState;
  owner_type: PatreonMediaOwnerType;
  owner_id: string;
  owner_relationship: PatreonMediaOwnerRelationship;
  upload_expires_at: string;
  upload_url: string;
  upload_parameters: PatreonMediaUploadParameters;
  download_url: string;
  image_urls: PatreonMediaImageUrls;
  created_at: string;
  metadata: PatreonMediaMetadata;
  media_type: PatreonMediaType;
  display: PatreonMediaDisplay;
};

export type PatreonMediaUploadResponseData = {
  id: string;
  type: 'media';
  attributes: PatreonMediaUploadResponseAttributes;
};

export type PatreonMediaUploadResponseLinks = {
  self: string;
};

export type PatreonMediaUploadResponse = {
  data: PatreonMediaUploadResponseData;
  links: PatreonMediaUploadResponseLinks;
};
