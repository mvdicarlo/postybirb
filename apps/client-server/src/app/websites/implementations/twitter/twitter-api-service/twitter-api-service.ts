/* eslint-disable @typescript-eslint/naming-convention */
import { TwitterApi } from 'twitter-api-v2';

export interface TwitterAuthLinkResult {
  url: string;
  oauthToken: string;
  oauthTokenSecret: string;
}

export interface TwitterAccessTokenResult {
  accessToken: string;
  accessTokenSecret: string;
  screenName?: string;
  userId?: string;
}

/**
 *
 * Wrapper for Twitter API calls
 * Primarily uses twitter-api-v2
 *
 * @class TwitterApiServiceV2
 */
export class TwitterApiServiceV2 {
  /**
   * Generate a PIN-based (oob) auth link.
   */
  static async generateAuthLink(
    apiKey: string,
    apiSecret: string,
  ): Promise<TwitterAuthLinkResult> {
    const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink('oob');
    return {
      url,
      oauthToken: oauth_token,
      oauthTokenSecret: oauth_token_secret,
    };
  }

  /**
   * Exchange verifier (PIN) for access tokens.
   */
  static async login(
    apiKey: string,
    apiSecret: string,
    oauthToken: string,
    oauthTokenSecret: string,
    verifier: string,
  ): Promise<TwitterAccessTokenResult> {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    const { accessToken, accessSecret, screenName, userId } =
      await client.login(verifier);
    return {
      accessToken,
      accessTokenSecret: accessSecret,
      screenName: screenName ?? undefined,
      userId: userId?.toString(),
    };
  }
}
