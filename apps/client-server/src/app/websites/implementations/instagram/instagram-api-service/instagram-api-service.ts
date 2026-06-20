/* eslint-disable @typescript-eslint/naming-convention */
import { runWithProxyContextAsync } from '@postybirb/http';
import { Logger, PostyBirbLogger } from '@postybirb/logger';

const GRAPH_API_BASE = 'https://graph.instagram.com/v21.0';

function fetchWithInstagramProxy(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  return runWithProxyContextAsync({ websiteId: 'instagram' }, () =>
    fetch(input, init),
  );
}

type InstagramApiError = {
  message?: string;
  [key: string]: unknown;
};

type InstagramApiPayload = {
  error?: InstagramApiError;
  [key: string]: unknown;
};

function toApiPayload(value: unknown): InstagramApiPayload {
  if (value && typeof value === 'object') {
    return value as InstagramApiPayload;
  }
  return {};
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Temporary in-memory store for OAuth authorization codes.
 * Maps state nonce → { code, timestamp }.
 * Codes expire after 5 minutes.
 */
const pendingOAuthCodes = new Map<
  string,
  { code: string; timestamp: number }
>();

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Store an authorization code received from the OAuth callback.
 */
export function storeOAuthCode(state: string, code: string): void {
  pendingOAuthCodes.set(state, { code, timestamp: Date.now() });
}

/**
 * Retrieve and consume a stored authorization code.
 * Returns the code if found and not expired, otherwise undefined.
 */
export function retrieveOAuthCode(state: string): string | undefined {
  const entry = pendingOAuthCodes.get(state);
  if (!entry) return undefined;

  pendingOAuthCodes.delete(state);

  if (Date.now() - entry.timestamp > CODE_EXPIRY_MS) {
    return undefined;
  }

  return entry.code;
}

export interface InstagramTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface InstagramLongLivedTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // seconds (typically ~5184000 = 60 days)
}

export interface InstagramBusinessAccount {
  igUserId: string;
  igUsername: string;
}

export interface InstagramContainerResult {
  id: string;
}

export type InstagramContainerStatus =
  | 'EXPIRED'
  | 'ERROR'
  | 'FINISHED'
  | 'IN_PROGRESS'
  | 'PUBLISHED';

export interface InstagramPublishResult {
  id: string; // Media ID
}

export interface InstagramPublishingLimit {
  quota_usage: number;
  config: {
    quota_total: number;
    quota_duration: number;
  };
}

/**
 * Static utility class for Instagram Graph API operations.
 * Mirrors the pattern used by TwitterApiServiceV2.
 */
export class InstagramApiService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static loggerInstance: PostyBirbLogger;

  private static get logger(): PostyBirbLogger {
    if (!InstagramApiService.loggerInstance) {
      InstagramApiService.loggerInstance = Logger('InstagramApiService');
    }
    return InstagramApiService.loggerInstance;
  }

  // ========================================================================
  // OAuth Flow
  // ========================================================================

  /**
   * Generate the Instagram OAuth authorization URL.
   * Uses the Instagram API with Instagram Login flow.
   */
  static getAuthUrl(appId: string, redirectUri: string, state: string): string {
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_comments',
      'instagram_business_manage_insights',
    ].join(',');

    return (
      `https://www.instagram.com/oauth/authorize` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code` +
      `&force_reauth=true`
    );
  }

  /**
   * Exchange an authorization code for a short-lived access token.
   * Uses the Instagram API token endpoint (POST, form-urlencoded).
   */
  static async exchangeCodeForToken(
    appId: string,
    appSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<InstagramTokenResult> {
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetchWithInstagramProxy(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
    );
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error('Token exchange failed', data.error);
      throw new Error(
        readString(data.error, 'message') || 'Failed to exchange code for token',
      );
    }

    const accessToken = readString(data, 'access_token');
    const tokenType = readString(data, 'token_type');
    const expiresIn = readNumber(data, 'expires_in');
    if (!accessToken || !tokenType || expiresIn === undefined) {
      throw new Error('Instagram token response is missing required fields');
    }

    return {
      accessToken,
      tokenType,
      expiresIn,
    };
  }

  /**
   * Exchange a short-lived token for a long-lived token (~60 days).
   * Uses the Instagram Graph API ig_exchange_token grant.
   */
  static async getLongLivedToken(
    appSecret: string,
    shortLivedToken: string,
  ): Promise<InstagramLongLivedTokenResult> {
    const url =
      `https://graph.instagram.com/access_token` +
      `?grant_type=ig_exchange_token` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&access_token=${encodeURIComponent(shortLivedToken)}`;

    const response = await fetchWithInstagramProxy(url);
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error(
        'Long-lived token exchange failed',
        data.error,
      );
      throw new Error(
        readString(data.error, 'message') || 'Failed to get long-lived token',
      );
    }

    const accessToken = readString(data, 'access_token');
    const tokenType = readString(data, 'token_type');
    const expiresIn = readNumber(data, 'expires_in');
    if (!accessToken || !tokenType || expiresIn === undefined) {
      throw new Error('Instagram long-lived token response is invalid');
    }

    return {
      accessToken,
      tokenType,
      expiresIn,
    };
  }

  /**
   * Refresh a still-valid long-lived token for a new 60-day token.
   * Uses the Instagram Graph API ig_refresh_token grant.
   */
  static async refreshLongLivedToken(
    accessToken: string,
  ): Promise<InstagramLongLivedTokenResult> {
    const url =
      `https://graph.instagram.com/refresh_access_token` +
      `?grant_type=ig_refresh_token` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetchWithInstagramProxy(url);
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error('Token refresh failed', data.error);
      throw new Error(
        readString(data.error, 'message') || 'Failed to refresh token',
      );
    }

    const refreshedAccessToken = readString(data, 'access_token');
    const tokenType = readString(data, 'token_type');
    const expiresIn = readNumber(data, 'expires_in');
    if (!refreshedAccessToken || !tokenType || expiresIn === undefined) {
      throw new Error('Instagram refreshed token response is invalid');
    }

    return {
      accessToken: refreshedAccessToken,
      tokenType,
      expiresIn,
    };
  }

  // ========================================================================
  // Account Discovery
  // ========================================================================

  /**
   * Get the authenticated Instagram user's ID and username.
   * With Instagram Login, the token is already scoped to the IG account — no Facebook Page lookup needed.
   */
  static async getInstagramBusinessAccount(
    accessToken: string,
  ): Promise<InstagramBusinessAccount> {
    const url = `${GRAPH_API_BASE}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetchWithInstagramProxy(url);
    const data = toApiPayload(await response.json());

    if (data.error) {
      throw new Error(
        readString(data.error, 'message') ||
          'Failed to get Instagram account info',
      );
    }

    const userId = readString(data, 'user_id');
    if (!userId) {
      throw new Error(
        'Could not retrieve Instagram user ID. Please ensure your account is a Business or Creator account.',
      );
    }

    return {
      igUserId: userId,
      igUsername: readString(data, 'username') || userId,
    };
  }

  /**
   * Verify the access token is still valid by fetching the IG user profile.
   */
  static async verifyToken(
    accessToken: string,
  ): Promise<{ username: string } | null> {
    try {
      const url = `${GRAPH_API_BASE}/me?fields=username&access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetchWithInstagramProxy(url);
      const data = toApiPayload(await response.json());

      if (data.error) {
        return null;
      }

      const username = readString(data, 'username');
      return username ? { username } : null;
    } catch {
      return null;
    }
  }

  // ========================================================================
  // Content Publishing
  // ========================================================================

  /**
   * Create a single image media container.
   * Instagram will fetch the image from the provided URL.
   */
  static async createImageContainer(
    accessToken: string,
    igUserId: string,
    imageUrl: string,
    caption?: string,
    altText?: string,
    isCarouselItem?: boolean,
  ): Promise<InstagramContainerResult> {
    const params = new URLSearchParams({
      access_token: accessToken,
      image_url: imageUrl,
    });

    if (caption && !isCarouselItem) {
      params.set('caption', caption);
    }
    if (altText) {
      params.set('alt_text', altText);
    }
    if (isCarouselItem) {
      params.set('is_carousel_item', 'true');
    }

    const url = `${GRAPH_API_BASE}/${igUserId}/media`;
    const response = await fetchWithInstagramProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error(
        'Failed to create image container',
        data.error,
      );
      throw new Error(
        readString(data.error, 'message') || 'Failed to create image container',
      );
    }

    const id = readString(data, 'id');
    if (!id) {
      throw new Error('Instagram did not return media container id');
    }
    return { id };
  }

  /**
   * Create a carousel container from child container IDs.
   */
  static async createCarouselContainer(
    accessToken: string,
    igUserId: string,
    childIds: string[],
    caption?: string,
  ): Promise<InstagramContainerResult> {
    const params = new URLSearchParams({
      access_token: accessToken,
      media_type: 'CAROUSEL',
      children: childIds.join(','),
    });

    if (caption) {
      params.set('caption', caption);
    }

    const url = `${GRAPH_API_BASE}/${igUserId}/media`;
    const response = await fetchWithInstagramProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error(
        'Failed to create carousel container',
        data.error,
      );
      throw new Error(
        readString(data.error, 'message') ||
          'Failed to create carousel container',
      );
    }

    const id = readString(data, 'id');
    if (!id) {
      throw new Error('Instagram did not return carousel container id');
    }
    return { id };
  }

  /**
   * Check the status of a media container.
   */
  static async checkContainerStatus(
    accessToken: string,
    containerId: string,
  ): Promise<InstagramContainerStatus> {
    const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetchWithInstagramProxy(url);
    const data = toApiPayload(await response.json());

    if (data.error) {
      throw new Error(
        readString(data.error, 'message') || 'Failed to check container status',
      );
    }

    const status = readString(data, 'status_code') as
      | InstagramContainerStatus
      | undefined;
    if (!status) {
      throw new Error('Instagram did not return container status');
    }
    return status;
  }

  /**
   * Poll a container until it reaches FINISHED status or errors out.
   * Instagram recommends polling once per minute, for no more than 5 minutes.
   */
  static async pollUntilReady(
    accessToken: string,
    containerId: string,
    timeoutMs = 300_000, // 5 minutes
    intervalMs = 10_000, // 10 seconds
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await InstagramApiService.checkContainerStatus(
        accessToken,
        containerId,
      );

      switch (status) {
        case 'FINISHED':
          return;
        case 'PUBLISHED':
          return;
        case 'ERROR':
          throw new Error(
            'Instagram media container processing failed (ERROR status)',
          );
        case 'EXPIRED':
          throw new Error(
            'Instagram media container expired before publishing',
          );
        case 'IN_PROGRESS':
          // Continue polling
          break;
        default:
          InstagramApiService.logger.warn(
            `Unknown container status: ${status}`,
          );
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, intervalMs);
      });
    }

    throw new Error(
      `Instagram media container did not finish processing within ${timeoutMs / 1000}s`,
    );
  }

  /**
   * Publish a media container (single image, carousel, or video).
   */
  static async publishMedia(
    accessToken: string,
    igUserId: string,
    containerId: string,
  ): Promise<InstagramPublishResult> {
    const params = new URLSearchParams({
      access_token: accessToken,
      creation_id: containerId,
    });

    const url = `${GRAPH_API_BASE}/${igUserId}/media_publish`;
    const response = await fetchWithInstagramProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = toApiPayload(await response.json());

    if (data.error) {
      InstagramApiService.logger.error('Failed to publish media', data.error);
      throw new Error(
        readString(data.error, 'message') || 'Failed to publish media',
      );
    }

    const id = readString(data, 'id');
    if (!id) {
      throw new Error('Instagram did not return published media id');
    }
    return { id };
  }

  /**
   * Get the permalink for a published media item.
   */
  static async getMediaPermalink(
    accessToken: string,
    mediaId: string,
  ): Promise<string | undefined> {
    try {
      const url = `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetchWithInstagramProxy(url);
      const data = toApiPayload(await response.json());

      if (data.error) {
        InstagramApiService.logger.warn(
          'Failed to get media permalink',
          data.error,
        );
        return undefined;
      }

      return readString(data, 'permalink');
    } catch {
      return undefined;
    }
  }

  /**
   * Check the current publishing rate limit usage.
   */
  static async checkPublishingLimit(
    accessToken: string,
    igUserId: string,
  ): Promise<InstagramPublishingLimit | null> {
    try {
      const url = `${GRAPH_API_BASE}/${igUserId}/content_publishing_limit?fields=quota_usage,config&access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetchWithInstagramProxy(url);
      const data = toApiPayload(await response.json());

      const items = Array.isArray(data.data) ? data.data : [];
      if (data.error || !items.length) {
        return null;
      }

      return items[0] as InstagramPublishingLimit;
    } catch {
      return null;
    }
  }
}
