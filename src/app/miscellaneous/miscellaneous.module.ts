import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { LicenseDialogComponent } from './components/license-dialog/license-dialog.component';
import { DonateDialogComponent } from './components/donate-dialog/donate-dialog.component';
import { ContactDialogComponent } from './components/contact-dialog/contact-dialog.component';
import { ChangelogDialogComponent } from './components/changelog-dialog/changelog-dialog.component';
import { AgreementDialogComponent } from './components/agreement-dialog/agreement-dialog.component';

import {
  MatButtonModule,
  MatButtonToggleModule,
  MatDialogModule,
  MatTabsModule
} from '@angular/material';
import { RemakeAlertDialogComponent } from './components/remake-alert-dialog/remake-alert-dialog.component'

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatTabsModule,
    TranslateModule
  ],
  declarations: [
    ChangelogDialogComponent,
    ContactDialogComponent,
    DonateDialogComponent,
    LicenseDialogComponent,
    AgreementDialogComponent,
    RemakeAlertDialogComponent
  ],
  entryComponents: [
    ChangelogDialogComponent,
    ContactDialogComponent,
    DonateDialogComponent,
    LicenseDialogComponent,
    AgreementDialogComponent,
    RemakeAlertDialogComponent
  ]
})
export class MiscellaneousModule { }
