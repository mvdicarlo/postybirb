import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class HighlightLinkedService {
  private highlightSubject = new Subject();
  private highlightMap: Map<any, number> = new Map();

  constructor() { }

  public listen(item): Observable<any> {
    this.increaseListenerCount(item);
    return this.highlightSubject.asObservable();
  }

  public unlisten(item: any): void {
    this.decreaseListenerCount(item);
  }

  public selected(item: any): void {
    this.highlightSubject.next({ added: { id: item, count: this.highlightMap.get(item) } });
  }

  public deselected(item: any): void {
    this.highlightSubject.next({ removed: { id: item, count: this.highlightMap.get(item) } });
  }

  private decreaseListenerCount(item: any): void {
    let count: number = this.highlightMap.get(item) || 0
    if (count - 1 <= 0) {
      this.highlightMap.delete(item);
    } else {
      this.highlightMap.set(item, count > 0 ? count - 1 : 0);
    }
  }

  private increaseListenerCount(item: any): void {
    let count: number = this.highlightMap.get(item) || 0
    this.highlightMap.set(item, count + 1);
  }

}
