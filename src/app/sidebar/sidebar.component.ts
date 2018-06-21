import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LicenseDialogComponent } from '../miscellaneous/components/license-dialog/license-dialog.component';
import { DonateDialogComponent } from '../miscellaneous/components/donate-dialog/donate-dialog.component';
import { ContactDialogComponent } from '../miscellaneous/components/contact-dialog/contact-dialog.component';
import { ChangelogDialogComponent } from '../miscellaneous/components/changelog-dialog/changelog-dialog.component';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Output() login: EventEmitter<any> = new EventEmitter<any>();

  public navItems = [
    {
      label: 'PostyBirb',
      route: '/postybirb',
      icon: 'email'
    }, {
      label: 'JournalBirb',
      route: '/journalbirb',
      icon: 'notifications'
    }];

  constructor(private dialog: MatDialog) { }

  public openLogin() {
    this.login.emit();
  }

  public openLicense() {
    this.dialog.open(LicenseDialogComponent);
  }

  public openDonate() {
    this.dialog.open(DonateDialogComponent);
  }

  public openContact() {
    this.dialog.open(ContactDialogComponent);
  }

  public openChangelog() {
    this.dialog.open(ChangelogDialogComponent);
  }

  public openPlannedUpdates() {
    window['openUrlInBrowser']('http://postybirb.com/update-blog');
  }

  public openTranslationHelp() {
    window['openUrlInBrowser']('http://www.postybirb.com/help-translate.html');
  }

}
