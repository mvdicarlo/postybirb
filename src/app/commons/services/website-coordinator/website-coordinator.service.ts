import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject, Subscriber, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Website } from '../../interfaces/website.interface';
import { WebsiteStatus } from '../../enums/website-status.enum';

@Injectable()
export class WebsiteCoordinatorService {
  private websites: Map<string, Website>;
  private statusMap: Map<string, WebsiteStatus>;
  private usernameMap: Map<string, string>;
  private websiteStatusSubject: BehaviorSubject<any>;
  private statusObservable: Observable<any>;
  private internalNotifier: Subject<any>;
  private refreshIntervals: any = {};

  constructor() {
    this.websites = new Map();
    this.statusMap = new Map();
    this.usernameMap = new Map();

    this.websiteStatusSubject = new BehaviorSubject({});
    this.statusObservable = this.websiteStatusSubject.asObservable();

    this.internalNotifier = new Subject();
    this.internalNotifier.pipe(debounceTime(150)).subscribe(() => {
      this.websiteStatusSubject.next(this._getAllStatuses());
    });

  }

  public asObservable(): Observable<any> {
    return this.statusObservable;
  }

  public insertService(name: string, service: Website, refreshTime: number = 600000): void {
    this.websites.set(name, service);
    this._checkStatus(service);

    if (this.refreshIntervals[refreshTime]) {
      this.refreshIntervals[refreshTime].push(service);
    } else {
      this.refreshIntervals[refreshTime] = [service];
      interval(refreshTime).subscribe(() => {
        this._refresh(refreshTime);
      });
    }
  }

  public statusUpdated(name: string, status: WebsiteStatus): void {
    if (this.statusMap.get(name) !== status) {
      this.statusMap.set(name, status);
      this.internalNotifier.next(name);

      const website: Website = this.websites.get(name);
      website.getUser()
      .then(user => {
        if (!this.usernameMap.has(name)) {
          this.usernameMap.set(name, user);
        } else if (!user) {
          this.usernameMap.delete(name);
        }
      }).catch(err => {
        // dunno what to do with this honestly
      });
    } else {
      const website: Website = this.websites.get(name);
      website.getUser()
      .then(user => {
        if (user && user != this.usernameMap.get(name)) {
          this.usernameMap.set(name, user);
          this.internalNotifier.next(name);
        }
      }).catch(err => {
        // dunno what to do with this honestly
      });
    }
  }

  public unauthorizeWebsite(name: string): void {
    this.websites.get(name).unauthorize();
    this.statusUpdated(name, WebsiteStatus.Logged_Out);
  }

  public authorizeWebsite(name: string, authInfo: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.websites.get(name).authorize(authInfo).then((success) => resolve(success), () => reject(false));
    });
  }

  public getUsername(website: string): Promise<string> {
    return this.websites.get(website).getUser();
  }

  public getInfo(website: string): any {
    return this.websites.get(website).getInfo();
  }

  private _getWebsiteStatus(name: string): WebsiteStatus {
    return this.statusMap.get(name) || WebsiteStatus.Logged_Out;
  }

  private _getAllStatuses(): any {
    const statuses: any = {};
    this.statusMap.forEach((value, key) => {
      statuses[key] = value || WebsiteStatus.Logged_Out;
    });

    return statuses;
  }

  private _refresh(interval: number): void {
    const services: Website[] = this.refreshIntervals[interval];
    console.log('Refreshing on Interval: ' + interval, services);
    for (let i = 0; i < services.length; i++) {
      this._checkStatus(services[i]);
    }
  }

  public check(websiteName: string): void {
    this._checkStatus(this.websites.get(websiteName));
  }

  private _checkStatus(service: Website): void {
    service.refresh()
      .then(() => service.getStatus())
      .catch(() => service.getStatus());
  }
}
