import type {
  DescriptionValue,
  UpdateWebsiteDescriptionDto,
} from '@postybirb/types';
import { isEqual } from 'lodash';
import { v4 } from 'uuid';
import type { DescriptionSaveResult } from '../../../../../../api/website-options.api';

export type DescriptionSaveStatus = 'idle' | 'saving' | 'error' | 'conflict';

function content({ version, ...value }: DescriptionValue) {
  return value;
}

/** Reconciles only description drafts; other form fields keep their existing saves. */
export class DescriptionDraft {
  private local?: { value: DescriptionValue; sequence: number };
  private sequence = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private pending?: {
    sequence: number;
    mutationId: string;
    replacementRevision: number;
  };
  private ready = false;
  private failure?: 'error' | 'conflict';
  private readonly listeners = new Set<() => void>();
  private snapshot: { value: DescriptionValue; status: DescriptionSaveStatus };

  constructor(
    private saved: DescriptionValue,
    private readonly save: (
      update: UpdateWebsiteDescriptionDto,
    ) => Promise<DescriptionSaveResult>,
    private readonly onError: (error: unknown) => void,
  ) {
    this.snapshot = this.buildSnapshot();
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  public getSnapshot = () => this.snapshot;

  public setValue = (value: DescriptionValue) => {
    this.sequence += 1;
    this.local = { value, sequence: this.sequence };
    if (this.failure === 'error') this.failure = undefined;
    this.clearTimer();
    this.ready = false;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.ready = true;
      this.persist();
    }, 1250);
    this.publish();
  };

  public receive(value: DescriptionValue) {
    if ((value.version?.revision ?? 0) <= (this.saved.version?.revision ?? 0))
      return;
    if (
      (value.version?.replacementRevision ?? 0) >
      (this.saved.version?.replacementRevision ?? 0)
    ) {
      this.local = undefined;
      this.failure = undefined;
      this.clearTimer();
      this.ready = false;
    } else if (
      this.local &&
      value.version?.mutationId !== this.pending?.mutationId &&
      !isEqual(content(this.saved), content(value)) &&
      !isEqual(content(this.local.value), content(value))
    ) {
      this.failure = 'conflict';
      this.clearTimer();
      this.ready = false;
    }
    this.saved = value;
    this.publish();
  }

  public flush = async () => {
    this.clearTimer();
    this.ready = true;
    await this.persist();
  };
  public retry = () => {
    this.failure = undefined;
    this.flush();
  };
  public discard = () => {
    this.local = undefined;
    this.failure = undefined;
    this.ready = false;
    this.clearTimer();
    this.publish();
  };

  private clearTimer() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private buildSnapshot() {
    return {
      value: this.local?.value ?? this.saved,
      status:
        this.failure ??
        (this.pending ? ('saving' as const) : ('idle' as const)),
    };
  }
  private publish() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private async persist() {
    if (!this.ready || this.pending || this.failure || !this.local) return;
    const { value, sequence } = this.local;
    const expectedRevision = this.saved.version?.revision ?? 0;
    const request = {
      sequence,
      mutationId: v4(),
      replacementRevision: this.saved.version?.replacementRevision ?? 0,
    };
    this.pending = request;
    this.ready = false;
    this.publish();
    try {
      const result = await this.save({
        value,
        expectedRevision,
        mutationId: request.mutationId,
      });
      if (
        result.status === 'saved' &&
        ((result.value.version?.revision ?? 0) <= expectedRevision ||
          result.value.version?.mutationId !== request.mutationId)
      ) {
        throw new Error(
          // eslint-disable-next-line lingui/no-unlocalized-strings
          'The server did not acknowledge this description save',
        );
      }
      const stale =
        (result.value.version?.revision ?? 0) <
        (this.saved.version?.revision ?? 0);
      this.receive(result.value);
      if (
        result.status === 'saved' &&
        !stale &&
        this.local?.sequence === request.sequence &&
        (this.saved.version?.replacementRevision ?? 0) ===
          request.replacementRevision
      ) {
        this.local = undefined;
        this.failure = undefined;
      } else if (this.local && !this.failure) {
        if ((this.saved.version?.revision ?? 0) <= expectedRevision) {
          throw new Error(
            // eslint-disable-next-line lingui/no-unlocalized-strings
            'The server returned a non-progressing description revision',
          );
        }
        // Keep the debounce of newer typing unless it has already elapsed.
        if (stale || result.status === 'conflict') this.ready = true;
      }
    } catch (error) {
      if (this.local) this.failure = 'error';
      this.ready = false;
      this.onError(error);
    } finally {
      this.pending = undefined;
      if (!this.local) this.ready = false;
      this.publish();
      if (this.ready) this.persist();
    }
  }
}
