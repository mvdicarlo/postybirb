/**
 * Media metadata (alt text, sensitive media warning, "block Grok edit").
 *
 * Rettiwt-API has no resource for `media/metadata/create`, and `INewTweetMedia`
 * only supports `id` and `tags`, so this one request cannot go through Rettiwt.
 * It is kept in this single file so that when X changes the endpoint, or Rettiwt
 * gains a `MEDIA_METADATA` resource, this is the only place that needs touching
 * (ideally replaced by `rettiwt.tweet.request(ResourceType.MEDIA_METADATA, ...)`).
 */

const MEDIA_METADATA_URL = 'https://x.com/i/api/1.1/media/metadata/create.json';

/** Public web-client bearer token (same one x.com itself uses). */
const WEB_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export type SensitiveMediaWarning =
  | 'other'
  | 'adult_content'
  | 'graphic_violence';

export type MediaMetadata = {
  altText?: string;
  sensitiveMediaWarning?: SensitiveMediaWarning[];
  blockGrokEdit?: boolean;
};

export type MediaMetadataAuth = {
  /** "auth_token=..; ct0=..; twid=.." */
  cookieHeader: string;
  ct0: string;
};

export async function setMediaMetadata(
  auth: MediaMetadataAuth,
  mediaId: string,
  metadata: MediaMetadata,
): Promise<void> {
  const body: Record<string, unknown> = { media_id: mediaId };

  if (metadata.altText) {
    body.alt_text = { text: metadata.altText };
  }
  if (metadata.sensitiveMediaWarning?.length) {
    body.sensitive_media_warning = metadata.sensitiveMediaWarning;
  }
  if (metadata.blockGrokEdit) {
    body.grok_actions = { block_grok_edit: 'true' };
  }

  // Nothing but the id: no request needed
  if (Object.keys(body).length === 1) {
    return;
  }

  const res = await fetch(MEDIA_METADATA_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${WEB_BEARER_TOKEN}`,
      'content-type': 'application/json',
      cookie: auth.cookieHeader,
      'x-csrf-token': auth.ct0,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}