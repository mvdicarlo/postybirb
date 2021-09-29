export interface OAuthWebsite {
  onAuthorize(data: Record<string, unknown>, state: string): Promise<unknown>;
}
