import { Injectable } from '@nestjs/common';
import { AccountId, IWebsiteMetadata } from '@postybirb/types';

export interface PostingRateLimitReservation {
  acquired: boolean;
  rateLimitedUntil?: string;
}

@Injectable()
export class PostingRateLimiterService {
  private readonly nextAvailableAt = new Map<string, number>();

  public acquire(
    accountId: AccountId,
    metadata: IWebsiteMetadata,
  ): PostingRateLimitReservation {
    const interval = metadata.minimumPostWaitInterval ?? 0;
    if (!Number.isFinite(interval) || interval <= 0) {
      return { acquired: true };
    }

    const now = Date.now();
    const key = metadata.rateLimitScope === 'website'
      ? `website:${metadata.name}`
      : `account:${accountId}`;
    const nextAvailableAt = this.nextAvailableAt.get(key);

    if (nextAvailableAt !== undefined && nextAvailableAt > now) {
      return {
        acquired: false,
        rateLimitedUntil: new Date(nextAvailableAt).toISOString(),
      };
    }

    const reservedUntil = now + interval;
    this.nextAvailableAt.set(key, reservedUntil);
    return {
      acquired: true,
      rateLimitedUntil: new Date(reservedUntil).toISOString(),
    };
  }
}