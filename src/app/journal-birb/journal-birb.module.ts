import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PostyBirbModule } from '../posty-birb/posty-birb.module';

import {
  MatButtonModule,
  MatCardModule,
  MatInputModule,
  MatSelectModule,
  MatRadioModule,
  MatChipsModule,
  MatIconModule,
  MatDialogModule,
  MatTooltipModule,
  MatTabsModule
} from '@angular/material';

import { JournalPostDialogComponent } from './components/dialog/journal-post-dialog/journal-post-dialog.component';
import { SubmitStatusComponent } from './components/dialog/journal-post-dialog/submit-status/submit-status.component';
import { JournalBirbAppComponent } from './main/journal-birb-app/journal-birb-app.component';
import { JournalFormComponent } from './components/journal-form/journal-form.component';
import { AdditionalOptionsComponent } from './components/common/additional-options/additional-options.component';
import { WebsiteOptionsComponent } from './components/common/website-options/website-options.component';
import { OptionsSectionDirective } from './directives/options-section.directive';
import { TumblrFormComponent } from './components/additional-website-options/tumblr-form/tumblr-form.component';

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
    TranslateModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatTabsModule
  ],
  declarations: [
    JournalBirbAppComponent,
    JournalPostDialogComponent,
    SubmitStatusComponent,
    JournalFormComponent,
    AdditionalOptionsComponent,
    WebsiteOptionsComponent,
    OptionsSectionDirective,
    TumblrFormComponent
  ],
  entryComponents: [
    JournalPostDialogComponent,
    WebsiteOptionsComponent,
    TumblrFormComponent
  ]
})
export class JournalBirbModule { }
