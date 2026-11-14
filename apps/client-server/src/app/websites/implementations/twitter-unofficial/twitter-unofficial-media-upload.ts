import { ITwitterApiClientPlugin, TwitterApi } from 'twitter-api-v2';

/**
 * Rettiwt's `tweet.upload` doesn't send `media_type` / `media_category`, which X
 * needs for videos and GIFs, so only the media upload goes through twitter-api-v2.
 * It does chunked uploads, picks the category from the mime type and waits for
 * X to finish processing.
 *
 * Authentication is the same as the x.com web client: the public web bearer token
 * plus the logged in account's cookies.
 */
const WEB_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export type WebSession = {
  /** "auth_token=..; ct0=..; twid=.." */
  cookieHeader: string;
  ct0: string;
};

export async function uploadMedia(
  { cookieHeader, ct0 }: WebSession,
  file: Buffer,
  mimeType: string,
): Promise<string> {
  const cookieAuth: ITwitterApiClientPlugin = {
    onBeforeRequest: ({ requestOptions }) => {
      const headers = Object.assign(requestOptions.headers ?? {}, {
        cookie: cookieHeader,
        'x-csrf-token': ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
      });
      // We don't really want users to be identified
      delete (headers as Record<string, unknown>)['x-user-agent']
      
      // eslint-disable-next-line no-param-reassign
      requestOptions.headers = headers;
    },
  };

  const client = new TwitterApi(WEB_BEARER_TOKEN, { plugins: [cookieAuth] });
  return client.v1.uploadMedia(file, {
    mimeType
  });
}