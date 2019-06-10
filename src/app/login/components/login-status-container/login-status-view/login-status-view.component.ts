import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebsiteStatus, LoginStatus } from 'src/app/websites/interfaces/website-service.interface';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { MatDialog } from '@angular/material';
import { WebsiteConfig } from 'src/app/websites/decorators/website-decorator';
import { LoginProfileSelectDialog } from '../../login-profile-select-dialog/login-profile-select-dialog.component';
import { LoginProfile } from 'src/app/login/interfaces/login-profile';

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
    private dialog: MatDialog,
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
    this.profileSubscription = this._loginProfileManager.profileChanges.subscribe(profiles => {
      const existingKeys = profiles.map(p => p.id); // check for any removed statuses/profiles
      const statuses = this.statuses;
      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        if (!existingKeys.includes(status.profileId)) {
          this.statuses.splice(i, 1);
        }
      }
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
      this._openLoginDialog(profileId);
    } else {
      this.dialog.open(LoginProfileSelectDialog)
        .afterClosed()
        .subscribe((result: LoginProfile) => {
          if (result) {
            this._openLoginDialog(result.id)
          }
        });
    }
  }

  private _openLoginDialog(profileId: string): void {
    const { displayedName, login }: WebsiteConfig = this.config.websiteConfig;
    this.dialog.open(login.dialog, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      data: {
        title: displayedName,
        url: login.url,
        persist: profileId,
        website: this.config.class
      }
    })
      .afterClosed()
      .subscribe(() => {
        this._loginManager.updateProfiles([profileId], { websites: [this.config.name] });
      });
  }

}
