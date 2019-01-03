import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PostState {
  id: any;
  percent: number;
  currentWebsite: string;
  waitingFor: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PostStateTrackerService {
  private subject: BehaviorSubject<PostState>;
  public stateChanges: Observable<PostState>;

  constructor() {
    this.subject = new BehaviorSubject(undefined);
    this.stateChanges = this.subject.asObservable();
  }

  public updateState(state: PostState): void {
    this.subject.next(state);
  }
}
