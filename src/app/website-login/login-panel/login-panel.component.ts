import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsiteManagerService } from '../../commons/services/website-manager/website-manager.service';
import { WebsiteStatus } from '../../commons/enums/website-status.enum';
import { WebLogo } from '../../commons/enums/web-logo.enum';
import { MatDialog, MatDialogRef } from '@angular/material';

@Component({
  selector: 'login-panel',
  templateUrl: './login-panel.component.html',
  styleUrls: ['./login-panel.component.css']
})
export class LoginPanelComponent implements OnInit, OnDestroy {
  @Input() dialogComponent: any;
  @Input() website: string;

  private statusSubscription: Subscription;
  public status: any;
  public loading: boolean;
  public logo: string;

  constructor(private webManager: WebsiteManagerService, private dialog: MatDialog) {

  }

  ngOnInit() {
    this.status = { status: WebsiteStatus.Logged_Out, username: 'Unknown' };
    this.statusSubscription = this.webManager.getObserver().subscribe(message => {
      if (message && message[this.website] !== undefined) this.handleStatusUpdate(message[this.website]);
    });

    this.logo = WebLogo[this.website];
    this.loading = true;
    this.webManager.checkLogin(this.website);
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  handleStatusUpdate(status: any): void {
    switch (status) {
      case WebsiteStatus.Logged_In:
        this.status.status = WebsiteStatus.Logged_In;
        this.webManager.getUsername(this.website).then(username => {
          this.status.username = username;
        }).catch(err => {
          this.status.username = 'Unknown';
        });
        break;
      case WebsiteStatus.Logged_Out:
        this.status.username = '';
        this.status.status = WebsiteStatus.Logged_Out;
        break;
      case WebsiteStatus.Offline:
        this.status.username = '';
        this.status.status = WebsiteStatus.Offline;
        break;
      default:
        this.status.username = '';
        this.status.status = WebsiteStatus.Logged_Out;
        break;
    }

    this.loading = false;
  }

  openDialog(): void {
    let ref = this.dialog.open(this.dialogComponent, {
      height: '100%',
      width: '90%'
    });

    ref.afterClosed().subscribe(result => {
      this.webManager.checkLogin(this.website);
    });
  }

}
