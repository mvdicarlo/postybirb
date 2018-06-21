import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PostyBirbModule } from '../posty-birb/posty-birb.module';
import { CKEditorModule } from 'ng2-ckeditor';

import {
  MatButtonModule,
  MatCardModule,
  MatInputModule,
  MatSelectModule,
  MatRadioModule,
  MatChipsModule,
  MatIconModule,
  MatDialogModule,
  MatSnackBarModule
} from '@angular/material';

import { JournalPostDialogComponent } from './components/dialog/journal-post-dialog/journal-post-dialog.component';
import { SubmitStatusComponent } from './components/dialog/journal-post-dialog/submit-status/submit-status.component';
import { JournalBirbAppComponent } from './main/journal-birb-app/journal-birb-app.component';

const routes: Routes = [
  { path: 'journalbirb', component: JournalBirbAppComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    PostyBirbModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatChipsModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    ReactiveFormsModule,
    CKEditorModule
  ],
  declarations: [
    JournalBirbAppComponent,
    JournalPostDialogComponent,
    SubmitStatusComponent
  ],
  entryComponents: [JournalPostDialogComponent]
})
export class JournalBirbModule { }
