import { Injectable } from '@nestjs/common';
import { AccountRepository, UnitOfWorkRepository } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { AccountId, IWebsiteMetadata } from '@postybirb/types';
import { WebsiteRegistryService } from '../websites/website-registry.service';

export interface PostingRateLimitReservation {
  acquired: boolean;
  rateLimitedUntil?: string;
}

@Injectable()
export class PostingRateLimiterService {
  private readonly logger = Logger(PostingRateLimiterService.name);

  protected readonly accountRepository = new AccountRepository();

  protected readonly unitOfWorkRepository = new UnitOfWorkRepository();

  private readonly nextAvailableAt = new Map<string, number>();

  private initialization?: Promise<void>;

  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  public initialize(): Promise<void> {
    this.initialization ??= this.hydrate().catch((error) => {
      this.initialization = undefined;
      throw error;
    });
    return this.initialization;
  }

  public async acquire(
    accountId: AccountId,
    metadata: IWebsiteMetadata,
  ): Promise<PostingRateLimitReservation> {
    await this.initialize();

    const interval = metadata.minimumPostWaitInterval ?? 0;
    if (!Number.isFinite(interval) || interval <= 0) {
      return { acquired: true };
    }

    const now = Date.now();
    const key = this.getKey(accountId, metadata);
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

  private async hydrate(): Promise<void> {
    const now = Date.now();
    const [accounts, persistedReservations] = await Promise.all([
      this.accountRepository.findAll(),
      this.unitOfWorkRepository.find({
        where: (unit, { isNotNull }) => isNotNull(unit.rateLimitedUntil),
      }),
    ]);
    const accountsById = new Map(
      accounts.map((account) => [account.id, account]),
    );
    const metadataByWebsite = new Map(
      this.websiteRegistry
        .getWebsiteDefinitions()
        .map((definition) => [definition.id, definition.metadata]),
    );

    for (const unit of persistedReservations) {
      const expiresAt = Date.parse(unit.rateLimitedUntil ?? '');
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        continue;
      }

      try {
        const account = accountsById.get(unit.accountId);
        const metadata = account
          ? metadataByWebsite.get(account.website)
          : undefined;
        if (!metadata) {
          this.logger.warn(
            `Unable to hydrate rate limit for account '${unit.accountId}'`,
          );
          continue;
        }

        const interval = metadata.minimumPostWaitInterval ?? 0;
        if (!Number.isFinite(interval) || interval <= 0) {
          continue;
        }

        const key = this.getKey(unit.accountId, metadata);
        const current = this.nextAvailableAt.get(key) ?? 0;
        if (expiresAt > current) {
          this.nextAvailableAt.set(key, expiresAt);
        }
      } catch (error) {
        this.logger
          .withError(error)
          .warn(`Unable to hydrate rate limit for account '${unit.accountId}'`);
      }
    }
  }

  private getKey(accountId: AccountId, metadata: IWebsiteMetadata): string {
    return metadata.rateLimitScope === 'website'
      ? `website:${metadata.name}`
      : `account:${accountId}`;
  }
}
