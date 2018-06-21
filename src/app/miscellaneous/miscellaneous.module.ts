import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { LicenseDialogComponent } from './components/license-dialog/license-dialog.component';
import { DonateDialogComponent } from './components/donate-dialog/donate-dialog.component';
import { ContactDialogComponent } from './components/contact-dialog/contact-dialog.component';
import { ChangelogDialogComponent } from './components/changelog-dialog/changelog-dialog.component';

import {
  MatButtonModule,
  MatButtonToggleModule,
  MatDialogModule
} from '@angular/material'

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    TranslateModule
  ],
  declarations: [
    ChangelogDialogComponent,
    ContactDialogComponent,
    DonateDialogComponent,
    LicenseDialogComponent
  ],
  entryComponents: [
    ChangelogDialogComponent,
    ContactDialogComponent,
    DonateDialogComponent,
    LicenseDialogComponent
  ]
})
export class MiscellaneousModule { }
