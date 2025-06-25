import { EntityId } from '@postybirb/types';
import { Observable, Subject } from 'rxjs';
import { Constructor } from 'type-fest';
import AppSocket from '../transports/websocket';

export type IdBasedRecord = {
  id: EntityId;
};

export type StoreManagerDataResult<T> = {
  data: T[];
  map: Map<EntityId, T>;
};

export type StorageManagerOptions<T> = {
  ModelConstructor?: Constructor<T>;
  filter?: (data: T) => boolean;
  onEachMessage?: (data: T) => void;
};

/**
 * Manages keeping data in sync with backend database.
 *
 * @class StoreManager
 * @template T
 */
export default class StoreManager<T extends IdBasedRecord> {
  private data: T[];

  private readonly subject: Subject<StoreManagerDataResult<T>>;

  public readonly updates: Observable<StoreManagerDataResult<T>>;

  public initLoadCompleted = false;

  constructor(
    private readonly websocketDomain: string,
    private readonly refreshDataFn: () => Promise<T[]>,
    private readonly options: StorageManagerOptions<T> = {},
  ) {
    this.data = [];
    this.subject = new Subject<StoreManagerDataResult<T>>();
    this.updates = this.subject.asObservable();
    AppSocket.on(websocketDomain, (messages: T[]) =>
      this.handleMessages(messages),
    );
    refreshDataFn()
      .then((messages: T[]) => this.handleMessages(messages))
      .finally(() => {
        this.initLoadCompleted = true;
      });
  }

  private handleMessages(messages: T[]): void {
    let m = messages ?? [];
    if (this.options.filter) {
      m = m.filter(this.options.filter);
    }
    if (this.options.onEachMessage) {
      m.forEach(this.options.onEachMessage);
    }
    this.data = m;
    this.subject.next(this.getData());
  }

  public refresh() {
    return this.refreshDataFn().then((messages: T[]) =>
      this.handleMessages(messages),
    );
  }

  public getData(): StoreManagerDataResult<T> {
    const data = JSON.parse(JSON.stringify(this.data ?? []));
    const { ModelConstructor } = this.options;
    const records = ModelConstructor
      ? data.map((d: unknown) => new ModelConstructor(d))
      : data;

    const map = new Map<EntityId, T>();
    records.forEach((record: T) => {
      map.set(record.id, record);
    });

    return { data: records, map };
  }
}
