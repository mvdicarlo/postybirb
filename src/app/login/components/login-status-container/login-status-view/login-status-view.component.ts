import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebsiteStatus, LoginStatus } from 'src/app/websites/interfaces/website-service.interface';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';

interface Status {
  profileId: string;
  status: WebsiteStatus;
}

@Component({
  selector: 'login-status-view',
  templateUrl: './login-status-view.component.html',
  styleUrls: ['./login-status-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginStatusViewComponent implements OnInit, OnDestroy {
  @Input() config: WebsiteRegistryConfig;

  private statusSubscription: Subscription = Subscription.EMPTY;
  private profileSubscription: Subscription = Subscription.EMPTY;
  public title: string;
  public statuses: Status[] = [];

  constructor(
    private _loginManager: LoginManagerService,
    private _loginProfileManager: LoginProfileManagerService,
    private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.title = this.config.websiteConfig.displayedName || this.config.name;
    this.statusSubscription = this._loginManager.statusChanges.pipe(
      map(profileStatuses => {
        const statusMap: Status[] = [];
        Object.keys(profileStatuses).forEach(profileId => {
          const statuses = profileStatuses[profileId];
          if (statuses[this.config.name]) {
            statusMap.push({
              profileId,
              status: statuses[this.config.name]
            });
          }
        });
        return statusMap;
      })
    ).subscribe(statuses => {
      this.statuses = statuses.filter(s => s.status.status === LoginStatus.LOGGED_IN);
      this._changeDetector.markForCheck();
    });

    // only listened to for profile name changes
    this.profileSubscription = this._loginProfileManager.profileChanges.subscribe(() => {
      this._changeDetector.markForCheck()
    });

    this._changeDetector.markForCheck();
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
    this.profileSubscription.unsubscribe();
  }

  public login(profileId?: string): void {
    if (profileId) {
      // TODO open profile using provided profile id
      // TODO allow a generic type of dialog
    } else {
      // TODO open profile selector
    }
  }

}
