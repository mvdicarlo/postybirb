import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebsiteOptionsRepository } from '@postybirb/database';
import { formBuilder } from '@postybirb/form-builder';
import { Logger } from '@postybirb/logger';
import { AccountId, IAccountDto, SubmissionType } from '@postybirb/types';
import {
    ACCOUNT_REMOVED,
    ACCOUNT_STATE_CHANGED,
    AccountRemovedEvent,
    AccountStateChangedEvent,
} from '../account/account.events';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { SubmissionEventPublisher } from './submission-event.publisher';

type FormFingerprints = Map<SubmissionType, string>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

@Injectable()
export class SubmissionAccountEventListener implements OnModuleInit {
  private readonly logger = Logger(SubmissionAccountEventListener.name);

  private readonly websiteOptionsRepository = new WebsiteOptionsRepository();

  private readonly fingerprints = new Map<AccountId, FormFingerprints>();

  private readonly revisions = new Map<AccountId, number>();

  private readonly pendingTypes = new Map<AccountId, Set<SubmissionType>>();

  private ready = false;

  @OnEvent(ACCOUNT_STATE_CHANGED)
  private accountChanged(events: AccountStateChangedEvent[]): void {
    events.forEach((event) => {
      this.handleAccountChanged(event.account).catch((error) => {
        this.logger
          .withError(error)
          .error('Failed to handle Account form change');
      });
    });
  }

  @OnEvent(ACCOUNT_REMOVED)
  private accountRemoved(events: AccountRemovedEvent[]): void {
    events.forEach((event) => {
      this.fingerprints.delete(event.accountId);
      this.revisions.delete(event.accountId);
      this.pendingTypes.delete(event.accountId);
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

  private async handleAccountChanged(account: IAccountDto): Promise<void> {
    if (!this.ready || account.state.pending) {
      return;
    }

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

    const previous = this.fingerprints.get(account.id);
    if (previous === undefined) {
      this.fingerprints.set(account.id, fingerprints);
      return;
    }

    const changedTypes = new Set(
      [...previous.keys(), ...fingerprints.keys()].filter(
        (type) => previous.get(type) !== fingerprints.get(type),
      ),
    );
    if (!changedTypes.size) {
      return;
    }

    this.fingerprints.set(account.id, fingerprints);
    const pendingTypes = this.pendingTypes.get(account.id) ?? new Set();
    changedTypes.forEach((type) => pendingTypes.add(type));
    this.pendingTypes.set(account.id, pendingTypes);
    const revision = (this.revisions.get(account.id) ?? 0) + 1;
    this.revisions.set(account.id, revision);
    try {
      const options = await this.websiteOptionsRepository.find({
        where: (option, { eq }) => eq(option.accountId, account.id),
        with: { submission: true },
      });
      if (this.revisions.get(account.id) === revision) {
        const typesToPublish = this.pendingTypes.get(account.id) ?? new Set();
        this.submissionEventPublisher.markChanged(
          options.flatMap((option) =>
            option.submission && typesToPublish.has(option.submission.type)
              ? [option.submissionId]
              : [],
          ),
        );
        this.pendingTypes.delete(account.id);
      }
    } catch (error) {
      if (this.revisions.get(account.id) === revision) {
        this.fingerprints.set(account.id, previous);
      }
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
