import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebsiteOptionsRepository } from '@postybirb/database';
import { formBuilder } from '@postybirb/form-builder';
import { Logger } from '@postybirb/logger';
import { AccountId, IAccountDto, SubmissionType } from '@postybirb/types';
import { Mutex } from 'async-mutex';
import {
  ACCOUNT_REMOVED,
  ACCOUNT_STATE_CHANGED,
} from '../account/account.events';
import {
  EntityRemovedEvent,
  EntityUpdatedEvent,
} from '../common/events/entity-crud.events';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { SubmissionEventPublisher } from './submission-event.publisher';

type FormFingerprints = Map<SubmissionType, string>;

// Produces a stable, order-independent string for a value so two structurally
// equal form definitions hash to the same fingerprint regardless of key order.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        // eslint-disable-next-line no-param-reassign
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * Watches account state changes and, when an account's form definition changes,
 * marks the affected submissions dirty so their projections get rebuilt.
 *
 * Each account keeps a fingerprint per submission type; a change is only fanned
 * out to submissions whose type's fingerprint actually differs. Work is
 * serialized per account with a {@link Mutex} so overlapping change events for
 * the same account run one at a time (the fingerprint baseline stays consistent
 * and an in-flight lookup can't be clobbered).
 */
@Injectable()
export class SubmissionAccountEventListener implements OnModuleInit {
  private readonly logger = Logger(SubmissionAccountEventListener.name);

  private readonly websiteOptionsRepository = new WebsiteOptionsRepository();

  // Last-known form fingerprint per account, keyed by submission type. This is
  // the baseline each incoming change is diffed against.
  private readonly fingerprints = new Map<AccountId, FormFingerprints>();

  // One mutex per account to serialize its change handling. Pruned on removal.
  private readonly locks = new Map<AccountId, Mutex>();

  // Flipped once the initial fingerprint seed completes; events before this are
  // ignored so we don't fan out on the startup baseline.
  private ready = false;

  @OnEvent(ACCOUNT_STATE_CHANGED)
  private accountChanged(events: EntityUpdatedEvent<IAccountDto>[]): void {
    events.forEach((event) => {
      this.handleAccountChanged(event.entity).catch((error) => {
        this.logger
          .withError(error)
          .error('Failed to handle Account form change');
      });
    });
  }

  @OnEvent(ACCOUNT_REMOVED)
  private accountRemoved(events: EntityRemovedEvent[]): void {
    events.forEach((event) => {
      this.fingerprints.delete(event.id);
      this.locks.delete(event.id);
    });
  }

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly submissionEventPublisher: SubmissionEventPublisher,
  ) {}

  onModuleInit(): void {
    this.seedFingerprints().catch((error) => {
      this.logger.withError(error).error('Failed to seed Account form state');
    });
  }

  private async seedFingerprints(): Promise<void> {
    try {
      await this.websiteRegistry.waitForInitialization();
      // Capture the current form state for every known account so later changes
      // have a baseline to diff against without fanning out on startup.
      this.websiteRegistry.getAll().forEach((instance) => {
        try {
          this.fingerprints.set(
            instance.accountId,
            this.buildFingerprints(instance),
          );
        } catch (error) {
          this.logger
            .withError(error)
            .error(
              `Failed to seed form fingerprint for '${instance.accountId}'`,
            );
        }
      });
      this.ready = true;
    } catch (error) {
      this.logger
        .withError(error)
        .error('Failed to seed account form fingerprints');
    }
  }

  private handleAccountChanged(account: IAccountDto): Promise<void> {
    // Ignore events before the baseline is seeded, or while the account is still
    // in a transient/pending state (its form isn't settled yet).
    if (!this.ready || account.state.pending) {
      return Promise.resolve();
    }

    // Serialize per account so concurrent changes don't race on the fingerprint.
    return this.lockFor(account.id).runExclusive(() =>
      this.resolveAccountChange(account),
    );
  }

  private lockFor(accountId: AccountId): Mutex {
    let mutex = this.locks.get(accountId);
    if (!mutex) {
      mutex = new Mutex();
      this.locks.set(accountId, mutex);
    }
    return mutex;
  }

  private async resolveAccountChange(account: IAccountDto): Promise<void> {
    const instance = this.websiteRegistry.findInstance(account);
    if (!instance) {
      return;
    }

    let fingerprints: FormFingerprints;
    try {
      fingerprints = this.buildFingerprints(instance);
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Failed to build form fingerprint for '${account.id}'`);
      return;
    }

    // No baseline yet (e.g. account added after seed) -> record and stop.
    const previous = this.fingerprints.get(account.id);
    if (previous === undefined) {
      this.fingerprints.set(account.id, fingerprints);
      return;
    }

    // Only the submission types whose form definition actually changed.
    const changedTypes = new Set(
      [...previous.keys(), ...fingerprints.keys()].filter(
        (type) => previous.get(type) !== fingerprints.get(type),
      ),
    );
    if (!changedTypes.size) {
      return;
    }

    this.fingerprints.set(account.id, fingerprints);
    try {
      // Find this account's submission options and mark the ones whose type's
      // form changed as dirty for reprojection.
      const options = await this.websiteOptionsRepository.find({
        where: (option, { eq }) => eq(option.accountId, account.id),
        with: { submission: true },
      });
      this.submissionEventPublisher.markChanged(
        options.flatMap((option) =>
          option.submission && changedTypes.has(option.submission.type)
            ? [option.submissionId]
            : [],
        ),
      );
    } catch (error) {
      // Roll the baseline back so the change is retried on the next event.
      this.fingerprints.set(account.id, previous);
      this.logger
        .withError(error)
        .error(`Failed to resolve submissions for Account '${account.id}'`);
    }
  }

  private buildFingerprints(instance: UnknownWebsite): FormFingerprints {
    return new Map(
      instance
        .getSupportedTypes()
        .map((type) => [
          type,
          canonicalStringify(
            formBuilder(
              instance.getModelFor(type),
              instance.getFormProperties(),
            ),
          ),
        ]),
    );
  }
}
