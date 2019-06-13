import { Component, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { WebsiteRegistryEntry, WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { MatDialog } from '@angular/material';
import { WebsiteFilterDialog } from '../website-filter-dialog/website-filter-dialog.component';
import { getUnfilteredWebsites } from '../../helpers/displayable-websites.helper';
import { LoginManagerService } from '../../services/login-manager.service';
import { WebsiteStatus, LoginStatus } from 'src/app/websites/interfaces/website-service.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'login-status-container',
  templateUrl: './login-status-container.component.html',
  styleUrls: ['./login-status-container.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginStatusContainerComponent implements OnDestroy {
  public registeredWebsites: WebsiteRegistryEntry = {};
  public loggedInWebsites: WebsiteRegistryConfig[] = [];
  public loggedOutWebsites: WebsiteRegistryConfig[] = [];

  private statusSubscription: Subscription = Subscription.EMPTY;

  constructor(
    private dialog: MatDialog,
    private _loginManager: LoginManagerService,
    private _changeDetector: ChangeDetectorRef
  ) {
    this._getDisplayableWebsites();
    this.statusSubscription = _loginManager.statusChanges
      .subscribe(() => this._getDisplayableWebsites());
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  public openFilterDialog(): void {
    this.dialog.open(WebsiteFilterDialog)
      .afterClosed()
      .subscribe(() => {
        this._getDisplayableWebsites();
      });
  }

  private _getDisplayableWebsites(): void {
    this.registeredWebsites = getUnfilteredWebsites();
    const loggedIn: WebsiteRegistryConfig[] = [];
    const loggedOut: WebsiteRegistryConfig[] = [];
    Object.values(this.registeredWebsites).forEach(registry => {
      const statuses: WebsiteStatus[] = this._loginManager.getStatusesForWebsite(registry.name);
      for (let i = 0; i < statuses.length; i++) {
        const status: WebsiteStatus = statuses[i];
        if (status && status.status === LoginStatus.LOGGED_IN) {
          loggedIn.push(registry);
          return;
        }
      }

      loggedOut.push(registry);
    });

    this.loggedInWebsites = loggedIn.sort(this._sort);
    this.loggedOutWebsites = loggedOut.sort(this._sort);
    this._changeDetector.markForCheck();
  }

  private _sort(a: WebsiteRegistryConfig, b: WebsiteRegistryConfig): number {
    const aName: any = a.name.toUpperCase();
    const bName: any = b.name.toUpperCase();
    if (aName < bName) return -1;
    if (aName > bName) return 1;
    return 0;
  }

}
