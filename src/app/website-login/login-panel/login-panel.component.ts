import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsiteCoordinatorService } from '../../commons/services/website-coordinator/website-coordinator.service';
import { WebsiteStatus } from '../../commons/enums/website-status.enum';
import { WebLogo } from '../../commons/enums/web-logo.enum';
import { MatDialog } from '@angular/material';

interface Status {
  status: WebsiteStatus;
  username: string;
}

@Component({
  selector: 'login-panel',
  templateUrl: './login-panel.component.html',
  styleUrls: ['./login-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPanelComponent implements OnInit, OnDestroy {
  @Input() dialogComponent: any;
  @Input() website: string;

  private statusSubscription: Subscription = Subscription.EMPTY;
  public status: Status;
  public loading: boolean;
  public logo: string;

  constructor(private websiteCoordinator: WebsiteCoordinatorService, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.status = { status: WebsiteStatus.Offline, username: 'Unknown' };
    this.statusSubscription = this.websiteCoordinator.asObservable().subscribe(message => {
      if (message && message[this.website] !== undefined) this.handleStatusUpdate(message[this.website]);
    });

    this.logo = WebLogo[this.website];
    this.loading = true;
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  async handleStatusUpdate(status: any) {
    let update: boolean = status !== this.status.status;

    if (status === WebsiteStatus.Logged_In) {
      const username = await this.websiteCoordinator.getUsername(this.website).catch(() => { });
      update = this.status.username !== username || update;
      this.status.username = username || 'Unknown';
      this.status.status = WebsiteStatus.Logged_In;
    } else {
      this.status.status = status;
      this.status.username = '';
    }

    if (update) {
      this._changeDetector.markForCheck();
    }

    this.loading = false;
  }

  openDialog(): void {
    let ref = this.dialog.open(this.dialogComponent, {
      height: '100%',
      width: '90%'
    });

    ref.afterClosed().subscribe(() => {
      this.websiteCoordinator.check(this.website);
    });
  }

}
