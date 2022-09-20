import { Observable, Subject } from 'rxjs';
import { Constructor } from 'type-fest';
import AppSocket from '../transports/websocket';

/**
 * Manages keeping data in sync with backend database.
 *
 * @class StoreManager
 * @template T
 */
export default class StoreManager<T> {
  private data: T[];

  private readonly subject: Subject<T[]>;

  public readonly updates: Observable<T[]>;

  public initLoadCompleted = false;

  constructor(
    private readonly websocketDomain: string,
    private readonly refreshDataFn: () => Promise<T[]>,
    private readonly ModelConstructor?: Constructor<T>
  ) {
    this.data = [];
    this.subject = new Subject<T[]>();
    this.updates = this.subject.asObservable();
    AppSocket.on(websocketDomain, (messages: T[]) =>
      this.handleMessages(messages)
    );
    refreshDataFn()
      .then((messages: T[]) => this.handleMessages(messages))
      .finally(() => {
        this.initLoadCompleted = true;
      });
  }

  private handleMessages(messages: T[]): void {
    this.data = messages ?? [];
    if (this.ModelConstructor) {
      const { ModelConstructor } = this;
      this.data = this.data.map((d) => new ModelConstructor(d));
    }
    this.subject.next([...this.data]);
  }

  public refresh() {
    return this.refreshDataFn().then((messages: T[]) =>
      this.handleMessages(messages)
    );
  }

  public getData(): T[] {
    return [...this.data];
  }
}
