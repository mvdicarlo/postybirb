export type PatreonCollectionThumbnail = {
  original: string;
  default: string;
  default_blurred: string;
  default_small: string;
  default_large: string;
  default_blurred_small: string;
  thumbnail: string;
  thumbnail_large: string;
  thumbnail_small: string;
  url: string;
  width: number;
  height: number;
};

export type PatreonCollectionAttributes = {
  title: string;
  description: string;
  created_at: string;
  edited_at: string;
  num_posts: number;
  num_posts_visible_for_creation: number;
  num_draft_posts: number;
  num_scheduled_posts: number;
  post_ids: string[];
  thumbnail: PatreonCollectionThumbnail;
  moderation_status: string;
  post_sort_type: string;
  default_layout: string | null;
};

export type PatreonCollection = {
  id: string;
  type: 'collection';
  attributes: PatreonCollectionAttributes;
};

export type PatreonCollectionPaginationCursors = {
  next: string | null;
};

export type PatreonCollectionPagination = {
  total: number;
  cursors: PatreonCollectionPaginationCursors;
};

export type PatreonCollectionMeta = {
  pagination: PatreonCollectionPagination;
};

export type PatreonCollectionResponse = {
  data: PatreonCollection[];
  meta: PatreonCollectionMeta;
};
