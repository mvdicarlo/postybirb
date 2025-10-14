import generator, { MegalodonInterface } from 'megalodon';

export interface AppRegistrationData {
  clientId: string;
  clientSecret: string;
}

/**
 * Service wrapper for Megalodon library operations.
 */
export class MegalodonApiService {
  /**
   * Register a new OAuth app with a Fediverse instance.
   */
  static async registerApp(
    instanceUrl: string,
    type: 'mastodon' | 'pleroma' | 'pixelfed',
    options: {
      client_name: string;
      redirect_uris: string;
      scopes: string;
      website: string;
    },
  ): Promise<AppRegistrationData> {
    const baseUrl = `https://${instanceUrl}`;

    const appData = await generator(type, baseUrl).registerApp(
      options.client_name,
      {
        redirect_uris: options.redirect_uris,
        scopes: options.scopes.split(' '),
        website: options.website,
      },
    );

    return {
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
    };
  }

  /**
   * Generate OAuth authorization URL.
   */
  static generateAuthUrl(
    instanceUrl: string,
    clientId: string,
    redirectUri: string,
    scopes: string,
  ): string {
    const baseUrl = `https://${instanceUrl}`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
    });

    return `${baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   */
  static async fetchAccessToken(
    instanceUrl: string,
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
    type: 'mastodon' | 'pleroma' | 'pixelfed',
  ): Promise<{ access_token: string }> {
    const baseUrl = `https://${instanceUrl}`;

    const tokenData = await generator(type, baseUrl).fetchAccessToken(
      clientId,
      clientSecret,
      code,
      redirectUri,
    );

    return {
      access_token: tokenData.access_token,
    };
  }

  /**
   * Create authenticated Megalodon client.
   */
  static createClient(
    instanceUrl: string,
    accessToken: string,
    type: 'mastodon' | 'pleroma' | 'pixelfed',
  ): MegalodonInterface {
    const baseUrl = `https://${instanceUrl}`;
    return generator(type, baseUrl, accessToken);
  }
}
