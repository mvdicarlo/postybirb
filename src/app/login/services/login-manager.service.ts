import { Injectable, Injector } from '@angular/core';
import { LoginProfileManagerService } from './login-profile-manager.service';
import { LoginProfile } from '../interfaces/login-profile';
import { WebsiteService, WebsiteStatus } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry, WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { WebsiteConfig } from 'src/app/websites/decorators/website-decorator';
import { interval, Subscription, BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, share } from 'rxjs/operators';

export interface ProfileStatuses {
  [key: string /* profile id */]: { [key: string /* website service constructor name */]: WebsiteStatus };
}

@Injectable({
  providedIn: 'root'
})
export class LoginManagerService {
  private readonly statusSubject: BehaviorSubject<ProfileStatuses> = new BehaviorSubject({});
  public readonly statusChanges: Observable<ProfileStatuses> = this.statusSubject.asObservable().pipe(debounceTime(250));

  private intervalMap: { [key: number]: WebsiteService[] } = {};
  private intervals: { [key: number]: Subscription } = {};
  private profileIds: string[] = [];
  private profileStatuses: ProfileStatuses = {};

  constructor(private _profileManager: LoginProfileManagerService, private injector: Injector) {
    const registeredWebsites = WebsiteRegistry.getRegistered();
    Object.keys(registeredWebsites).forEach(key => {
      this._registerInterval(registeredWebsites[key].class, registeredWebsites[key].websiteConfig);
    });

    _profileManager.profileChanges.subscribe(profiles => this._checkAndTrim(profiles));
  }

  /**
   * Registers profiles for intervals. Removes deleted profiles.
   * @param profiles list of profiles that exist in the app
   */
  private _checkAndTrim(profiles: LoginProfile[]): void {
    const profileKeys: string[] = profiles.map(p => p.id);

    const newIds: string[] = [];
    for (let i = 0; i < profileKeys.length; i++) {
      if (!this.profileIds.includes(profileKeys[i])) {
        newIds.push(profileKeys[i]);
      }
    }

    this.profileIds = profileKeys || [];
    this.updateProfiles(newIds);
  }

  /**
   * Registers a website for a refresh interval. Creates a new interval if it is the first time seeing the refresh timer.
   * @param service injection token name
   * @param config  website configuration - only uses refreshInterval
   */
  private _registerInterval(service: Function, config: WebsiteConfig): void {
    const token: WebsiteService = this.injector.get(service);
    this.intervalMap[config.refreshInterval] ?
      this.intervalMap[config.refreshInterval].push(token) : this.intervalMap[config.refreshInterval] = [token];

    if (this.intervals[config.refreshInterval]) {
      this.intervals[config.refreshInterval] = interval(config.refreshInterval)
        .subscribe(() => this._checkForStatusUpdates(config.refreshInterval));
    }
  }

  /**
   * Checks the website statuses for all registered websites on the given interval.
   * @param  interval interval to check statuses of
   */
  private _checkForStatusUpdates(interval: number): void {
    this._update(this.profileIds, this.intervalMap[interval]);
  }

  /**
   * Calls checkStatus functions and updates subscribers for the given services
   * @param ids      profile ids to check
   * @param services services/websites being checked
   */
  private _update(ids: string[], services: WebsiteService[]): void {
    for (let s of services) {
      for (let id of ids) {
        s.checkStatus(id)
          .then((status: WebsiteStatus) => {
            // ignore ids that have been removed since time of status check
            if (this.profileIds.includes(id)) {
              if (!this.profileStatuses[id]) this.profileStatuses[id] = {};
              this.profileStatuses[id][s.constructor.name] = status;
            }
          }).catch(err => {
            console.error('Unable to refresh id', id, s.constructor.name, err);
          }).finally(() => {
            this.statusSubject.next(this.profileStatuses);
          });
      }
    }
  }

  /**
   * Initiate a status check for all websites and intervals (unless filters are provided).
   * @param ids       profile ids to check
   * @param options   filters
   */
  public updateProfiles(ids: string[], options?: { websites: string[], intervals: number[] }): void {
    let services: WebsiteService[] = [];
    Object.keys(this.intervalMap).forEach(key => {
      if (options && options.intervals && options.intervals.length) {
        if (!options.intervals.includes(parseInt(key))) return;
      }

      services = [...services, ...this.intervalMap[key] || []];
    });

    if (options && options.websites) {
      services = services.filter(s => {
        if (options.websites.includes(s.constructor.name)) return true;
        return false;
      });
    }

    this._update(ids, services);
  }
}
