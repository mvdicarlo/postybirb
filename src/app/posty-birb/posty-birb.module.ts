import { NgModule, ModuleWithProviders, NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CKEditorModule } from 'ng2-ckeditor';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { NgxsModule } from '@ngxs/store';
import { PostyBirbState } from './stores/states/posty-birb.state';

import {
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatInputModule,
  MatRadioModule,
  MatSelectModule,
  MatTooltipModule,
  MatProgressBarModule,
  MatAutocompleteModule,
  MatIconModule,
  MatTabsModule,
  MatMenuModule,
  MatSlideToggleModule,
  MatBadgeModule,
  MatBottomSheetModule
} from '@angular/material';

import { CommonsModule } from '../commons/commons.module';
import { LogsModule } from '../logs/logs.module';

import { PostManagerService } from './services/post-manager/post-manager.service';
import { SchedulerService } from './services/scheduler/scheduler.service';
import { TemplatesService } from './services/templates/templates.service';

import { DescriptionHelpComponent } from './components/submission-form/base-website-form/description-field/description-help/description-help.component';
import { FaSpeciesSelectComponent } from './components/submission-form/websites/furaffinity-form/fa-species-select/fa-species-select.component';
import { WeasylFoldersComponent } from './components/submission-form/websites/weasyl-form/weasyl-folders/weasyl-folders.component';
import { FuraffinityFoldersComponent } from './components/submission-form/websites/furaffinity-form/furaffinity-folders/furaffinity-folders.component';
import { SofurryFoldersComponent } from './components/submission-form/websites/sofurry-form/sofurry-folders/sofurry-folders.component';
import { TumblrBlogSelectComponent } from './components/submission-form/websites/tumblr-form/tumblr-blog-select/tumblr-blog-select.component';
import { DeviantArtFoldersComponent } from './components/submission-form/websites/deviant-art-form/deviant-art-folders/deviant-art-folders.component';
import { ScheduleSubmissionDialogComponent } from './components/dialog/schedule-submission-dialog/schedule-submission-dialog.component';
import { FurryNetworkProfileSelectComponent } from './components/submission-form/websites/furry-network-form/furry-network-profile-select/furry-network-profile-select.component';
import { PostyBirbAppComponent } from './main/posty-birb-app/posty-birb-app.component';
import { DeviantArtCategorySelectComponent } from './components/submission-form/websites/deviant-art-form/deviant-art-category-select/deviant-art-category-select.component';
import { FormTemplateSelectComponent } from './components/submission-form/form-template-select/form-template-select.component';
import { CreateTemplateDialogComponent } from './components/dialog/create-template-dialog/create-template-dialog.component';
import { SubmissionRuleHelpDialogComponent } from './components/dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';
import { BaseWebsiteFormComponent } from './components/submission-form/base-website-form/base-website-form.component';
import { FuraffinityFormComponent } from './components/submission-form/websites/furaffinity-form/furaffinity-form.component';
import { DescriptionFieldComponent } from './components/submission-form/base-website-form/description-field/description-field.component';
import { TagFieldComponent } from './components/submission-form/base-website-form/tag-field/tag-field.component';
import { SubmissionFormComponent } from './components/submission-form/submission-form.component';
import { SubmissionCardComponent } from './components/submission-form/submission-card/submission-card.component';
import { SubmissionCardContainerComponent } from './components/submission-form/submission-card-container/submission-card-container.component';
import { TwitterFormComponent } from './components/submission-form/websites/twitter-form/twitter-form.component';
import { Route50FormComponent } from './components/submission-form/websites/route50-form/route50-form.component';
import { FurifficFormComponent } from './components/submission-form/websites/furiffic-form/furiffic-form.component';
import { WeasylFormComponent } from './components/submission-form/websites/weasyl-form/weasyl-form.component';
import { DeviantArtFormComponent } from './components/submission-form/websites/deviant-art-form/deviant-art-form.component';
import { E621FormComponent } from './components/submission-form/websites/e621-form/e621-form.component';
import { InkbunnyFormComponent } from './components/submission-form/websites/inkbunny-form/inkbunny-form.component';
import { FurryNetworkFormComponent } from './components/submission-form/websites/furry-network-form/furry-network-form.component';
import { PatreonFormComponent } from './components/submission-form/websites/patreon-form/patreon-form.component';
import { SofurryFormComponent } from './components/submission-form/websites/sofurry-form/sofurry-form.component';
import { TumblrFormComponent } from './components/submission-form/websites/tumblr-form/tumblr-form.component';
import { PixivFormComponent } from './components/submission-form/websites/pixiv-form/pixiv-form.component';
import { EditFormDialogComponent } from './components/submission-form/edit-form-dialog/edit-form-dialog.component';
import { SubmissionPickerComponent } from './components/submission-form/submission-picker/submission-picker.component';
import { SubmissionPickerItemComponent } from './components/submission-form/submission-picker/submission-picker-item/submission-picker-item.component';
import { SaveDialogComponent } from './components/submission-form/save-dialog/save-dialog.component';
import { AddSubmissionFileComponent } from './components/submission-form/submission-card-container/add-submission-file/add-submission-file.component';
import { SubmissionViewComponent } from './components/dialog/submission-view/submission-view.component';
import { SaveEditDialogComponent } from './components/submission-form/save-edit-dialog/save-edit-dialog.component';
import { DerpibooruFormComponent } from './components/submission-form/websites/derpibooru-form/derpibooru-form.component';
import { SubmissionSettingsDialogComponent } from './components/dialog/submission-settings-dialog/submission-settings-dialog.component';
import { HentaiFoundryFormComponent } from './components/submission-form/websites/hentai-foundry-form/hentai-foundry-form.component';
import { PostyBirbStatusBarComponent } from './components/posty-birb-status-bar/posty-birb-status-bar.component';
import { SubmissionSheetComponent } from './components/sheets/submission-sheet/submission-sheet.component';
import { SubmissionRowComponent } from './components/sheets/submission-sheet/submission-row/submission-row.component';
import { SubmissionTableComponent } from './components/sheets/submission-sheet/submission-table/submission-table.component';
import { HentaiFoundryCategorySelectComponent } from './components/submission-form/websites/hentai-foundry-form/hentai-foundry-category-select/hentai-foundry-category-select.component';
import { AdditionalImageOrderingDialogComponent } from './components/submission-form/submission-card/additional-image-ordering-dialog/additional-image-ordering-dialog.component';

const routes: Routes = [
  { path: 'postybirb', component: PostyBirbAppComponent }
];

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes),
    NgxsModule.forRoot([
      PostyBirbState
    ]),
    CommonsModule.forRoot(),
    LogsModule.forRoot(),
    CKEditorModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatMenuModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatBadgeModule,
    MatBottomSheetModule
  ],
  declarations: [
    DescriptionHelpComponent,
    FaSpeciesSelectComponent,
    WeasylFoldersComponent,
    FuraffinityFoldersComponent,
    SofurryFoldersComponent,
    TumblrBlogSelectComponent,
    DeviantArtFoldersComponent,
    ScheduleSubmissionDialogComponent,
    FurryNetworkProfileSelectComponent,
    PostyBirbAppComponent,
    DeviantArtCategorySelectComponent,
    FormTemplateSelectComponent,
    CreateTemplateDialogComponent,
    SubmissionRuleHelpDialogComponent,
    BaseWebsiteFormComponent,
    FuraffinityFormComponent,
    DescriptionFieldComponent,
    TagFieldComponent,
    SubmissionFormComponent,
    SubmissionCardComponent,
    SubmissionCardContainerComponent,
    TwitterFormComponent,
    Route50FormComponent,
    FurifficFormComponent,
    WeasylFormComponent,
    DeviantArtFormComponent,
    E621FormComponent,
    InkbunnyFormComponent,
    FurryNetworkFormComponent,
    PatreonFormComponent,
    SofurryFormComponent,
    TumblrFormComponent,
    PixivFormComponent,
    EditFormDialogComponent,
    SubmissionPickerComponent,
    SubmissionPickerItemComponent,
    SaveDialogComponent,
    AddSubmissionFileComponent,
    SubmissionViewComponent,
    SaveEditDialogComponent,
    DerpibooruFormComponent,
    SubmissionSettingsDialogComponent,
    HentaiFoundryFormComponent,
    PostyBirbStatusBarComponent,
    SubmissionSheetComponent,
    SubmissionRowComponent,
    SubmissionTableComponent,
    HentaiFoundryCategorySelectComponent,
    AdditionalImageOrderingDialogComponent
  ],
  entryComponents: [
    ScheduleSubmissionDialogComponent,
    CreateTemplateDialogComponent,
    SubmissionRuleHelpDialogComponent,
    EditFormDialogComponent,
    SaveDialogComponent,
    SubmissionViewComponent,
    SaveEditDialogComponent,
    SubmissionSettingsDialogComponent,
    SubmissionSheetComponent,
    AdditionalImageOrderingDialogComponent
  ],
  exports: [
    FormTemplateSelectComponent,
    TumblrBlogSelectComponent,
    DescriptionHelpComponent,
    FurryNetworkProfileSelectComponent,
    PostyBirbStatusBarComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class PostyBirbModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: PostyBirbModule,
      providers: [PostManagerService, SchedulerService, TemplatesService]
    }
  }
}
