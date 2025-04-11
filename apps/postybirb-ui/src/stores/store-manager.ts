import { EntityId } from '@postybirb/types';
import { Observable, Subject } from 'rxjs';
import { Constructor } from 'type-fest';
import AppSocket from '../transports/websocket';

type IdBasedRecord = {
  id: EntityId;
};

/**
 * Manages keeping data in sync with backend database.
 *
 * @class StoreManager
 * @template T
 */
export default class StoreManager<T extends IdBasedRecord> {
  private data: T[];

  private readonly subject: Subject<T[]>;

  public readonly updates: Observable<T[]>;

  public initLoadCompleted = false;

  public map = new Map<EntityId, T>();

  constructor(
    private readonly websocketDomain: string,
    private readonly refreshDataFn: () => Promise<T[]>,
    private readonly ModelConstructor?: Constructor<T>,
    private readonly filterFn?: (data: T) => boolean,
  ) {
    this.data = [];
    this.subject = new Subject<T[]>();
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
    if (this.filterFn) {
      m = m.filter(this.filterFn);
    }
    this.data = m;
    this.map.clear();
    m.forEach((d) => {
      const { ModelConstructor } = this;
      if (ModelConstructor) {
        this.map.set(d.id, new ModelConstructor(d));
      } else {
        this.map.set(d.id, d);
      }
    });
    this.subject.next(this.getData());
  }

  public refresh() {
    return this.refreshDataFn().then((messages: T[]) =>
      this.handleMessages(messages),
    );
  }

  public getMap(): Map<EntityId, T> {
    return this.map;
  }

  public getData(): T[] {
    const data = JSON.parse(JSON.stringify(this.data ?? []));
    const { ModelConstructor } = this;
    return ModelConstructor
      ? data.map((d: unknown) => new ModelConstructor(d))
      : data;
  }
}
