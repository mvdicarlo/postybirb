import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Submission } from 'src/app/database/models/submission.model';
import { Router } from '@angular/router';

export enum TabType {
  SUBMISSION = 'submission',
  JOURNAL = 'journal'
}

export interface TabInfo {
  id: number; // submissionId
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class TabManager {
  private readonly STORE: string = 'postybirb-tabs';
  private tabs: TabInfo[] = [];

  private tabSubject: BehaviorSubject<TabInfo[]> = new BehaviorSubject([]);
  public readonly tabChanges: Observable<TabInfo[]> = this.tabSubject.asObservable();

  constructor(private _route: Router) {
    this._initialize();
  }

  private _initialize(): void {
    this.tabs = store.get(this.STORE) || [];
    this.tabSubject.next(this.tabs);
  }

  private _save(): void {
    store.set(this.STORE, this.tabs);
  }

  private _shouldNavigate(removedId: number): boolean {
    const url: string = this._route.url;
    if (Number(url.split('/').pop()) == removedId) return true;
    return false;
  }

  private _findTab(id: number): TabInfo|null {
    return this.tabs.find(t => t.id === id);
  }

  public hasTab(id: number) {
    const index: number = this.tabs.findIndex(t => t.id === id);
    return index !== -1;
  }

  public addTab(submission: Submission): void {
    if (!this.hasTab(submission.id)) {
      const tab = {
        id: submission.id,
        type: submission.submissionType.toLowerCase(),
      };

      this.tabs.push(tab);
    }

    if (submission) {
      const tab = this._findTab(submission.id);
      this.tabSubject.next(this.tabs);
      this._route.navigateByUrl(`${tab.type}/${tab.id}`);
      this._save();
    }
  }

  public removeTab(id: number): void {
    const index: number = this.tabs.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tabs.splice(index, 1);
      this.tabSubject.next(this.tabs);
      if (this.tabs.length) {
        if (this._shouldNavigate(id)) {
          const tab = this.tabs[this.tabs.length - 1];
          this._route.navigateByUrl(`${tab.type}/${tab.id}`);
        }
      } else {
        this._route.navigateByUrl(`**`);
      }
    } else {
      this._route.navigateByUrl(`**`);
    }

    this._save();
  }

}
