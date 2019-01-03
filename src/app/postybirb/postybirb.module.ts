import { NgModule, NO_ERRORS_SCHEMA, ModuleWithProviders } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CKEditorModule } from 'ng2-ckeditor';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { NgxsModule } from '@ngxs/store';
import { PostyBirbState } from './stores/states/posty-birb.state';

import {
  MatAutocompleteModule,
  MatBottomSheetModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatRadioModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatStepperModule,
  MatTabsModule,
  MatTooltipModule,
  MatProgressBarModule,
  MatExpansionModule,
  MatButtonToggleModule
} from '@angular/material';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';

import { CommonsModule } from '../commons/commons.module';
import { LogsModule } from '../logs/logs.module';

import { PostManagerService } from './services/post-manager/post-manager.service';
import { PostService } from './services/post/post.service';
import { SchedulerService } from './services/scheduler/scheduler.service';
import { TemplatesService } from './services/templates/templates.service';

import { BaseOptionForm } from './components/base-option-form/base-option-form.component';
import { DescriptionFieldComponent } from './components/description-field/description-field.component';
import { DescriptionHelpComponent } from './components/description-field//description-help/description-help.component';
import { OptionsSectionDirective } from './directives/options-section.directive';
import { PostybirbAppComponent } from './main/postybirb-app/postybirb-app.component';
import { PostybirbPrimaryFormComponent } from './components/postybirb-primary-form/postybirb-primary-form.component';
import { SidebarNavigatorComponent } from './components/postybirb-primary-form/sidebar-navigator/sidebar-navigator.component';
import { SubmissionEditingFormComponent } from './components/submission-editing-form/submission-editing-form.component';
import { TagFieldComponent } from './components/tag-field/tag-field.component';

import { AdditionalImagesComponent } from './components/additional-images/additional-images.component';
import { AryionFormComponent } from './components/website-options/aryion-form/aryion-form.component';
import { CreateTemplateDialogComponent } from './components/dialog/create-template-dialog/create-template-dialog.component';
import { DerpibooruFormComponent } from './components/website-options/derpibooru-form/derpibooru-form.component';
import { DeviantArtCategorySelectComponent } from './components/website-options/deviant-art-form/deviant-art-category-select/deviant-art-category-select.component';
import { DeviantArtFoldersComponent } from './components/website-options/deviant-art-form/deviant-art-folders/deviant-art-folders.component';
import { DeviantArtFormComponent } from './components/website-options/deviant-art-form/deviant-art-form.component';
import { E621FormComponent } from './components/website-options/e621-form/e621-form.component';
import { FaSpeciesSelectComponent } from './components/website-options/furaffinity-form/fa-species-select/fa-species-select.component';
import { FormTemplateSelectComponent } from './components/form-template-select/form-template-select.component';
import { FuraffinityFoldersComponent } from './components/website-options/furaffinity-form/furaffinity-folders/furaffinity-folders.component';
import { FuraffinityFormComponent } from './components/website-options/furaffinity-form/furaffinity-form.component';
import { FurifficFormComponent } from './components/website-options/furiffic-form/furiffic-form.component';
import { FurryNetworkFormComponent } from './components/website-options/furry-network-form/furry-network-form.component';
import { FurryNetworkProfileSelectComponent } from './components/website-options/furry-network-form/furry-network-profile-select/furry-network-profile-select.component';
import { HentaiFoundryCategorySelectComponent } from './components/website-options/hentai-foundry-form/hentai-foundry-category-select/hentai-foundry-category-select.component';
import { HentaiFoundryFormComponent } from './components/website-options/hentai-foundry-form/hentai-foundry-form.component';
import { InkbunnyFormComponent } from './components/website-options/inkbunny-form/inkbunny-form.component';
import { MastodonFormComponent } from './components/website-options/mastodon-form/mastodon-form.component';
import { PaigeeWorldFormComponent } from './components/website-options/paigee-world-form/paigee-world-form.component';
import { PatreonFormComponent } from './components/website-options/patreon-form/patreon-form.component';
import { PixivFormComponent } from './components/website-options/pixiv-form/pixiv-form.component';
import { PostyBirbStatusBarComponent } from './components/posty-birb-status-bar/posty-birb-status-bar.component';
import { Route50FormComponent } from './components/website-options/route50-form/route50-form.component';
import { ScheduleSubmissionDialogComponent } from './components/dialog/schedule-submission-dialog/schedule-submission-dialog.component';
import { SofurryFoldersComponent } from './components/website-options/sofurry-form/sofurry-folders/sofurry-folders.component';
import { SofurryFormComponent } from './components/website-options/sofurry-form/sofurry-form.component';
import { SubmissionRowComponent } from './components/sheets/submission-sheet/submission-row/submission-row.component';
import { SubmissionRuleHelpDialogComponent } from './components/dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';
import { SubmissionSettingsDialogComponent } from './components/dialog/submission-settings-dialog/submission-settings-dialog.component';
import { SubmissionSheetComponent } from './components/sheets/submission-sheet/submission-sheet.component';
import { SubmissionTableComponent } from './components/sheets/submission-sheet/submission-table/submission-table.component';
import { SubmissionViewComponent } from './components/dialog/submission-view/submission-view.component';
import { TumblrBlogSelectComponent } from './components/website-options/tumblr-form/tumblr-blog-select/tumblr-blog-select.component';
import { TumblrFormComponent } from './components/website-options/tumblr-form/tumblr-form.component';
import { TwitterFormComponent } from './components/website-options/twitter-form/twitter-form.component';
import { WeasylFoldersComponent } from './components/website-options/weasyl-form/weasyl-folders/weasyl-folders.component';
import { WeasylFormComponent } from './components/website-options/weasyl-form/weasyl-form.component';
import { CopySubmissionSelectComponent } from './components/copy-submission-select/copy-submission-select.component';
import { ManageTemplatesDialogComponent } from './components/dialog/manage-templates-dialog/manage-templates-dialog.component';
import { SubmissionSaveDialogComponent } from './components/dialog/submission-save-dialog/submission-save-dialog.component';
import { FurryAminoFormComponent } from './components/website-options/furry-amino-form/furry-amino-form.component';
import { BulkSubmissionEditingFormComponent } from './components/bulk-submission-editing-form/bulk-submission-editing-form.component';
import { BulkUpdateDialogComponent } from './components/dialog/bulk-update-dialog/bulk-update-dialog.component';
import { NewgroundsFormComponent } from './components/website-options/newgrounds-form/newgrounds-form.component';
import { PostyBirbQueueState } from './stores/states/posty-birb-queue.state';
import { TitleTruncateDisplayComponent } from './components/title-truncate-display/title-truncate-display.component';

const routes: Routes = [
  {
    path: 'postybirb', component: PostybirbAppComponent,
  }
];

@NgModule({
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    CommonsModule.forRoot(),
    LogsModule.forRoot(),
    RouterModule.forChild(routes),
    NgxsModule.forRoot([
      PostyBirbState,
      PostyBirbQueueState
    ]),
    CKEditorModule,
    FormsModule,
    MatAutocompleteModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatRadioModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTabsModule,
    MatExpansionModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    OverlayModule,
    DragDropModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  declarations: [
    AdditionalImagesComponent,
    AryionFormComponent,
    BaseOptionForm,
    CreateTemplateDialogComponent,
    DerpibooruFormComponent,
    DescriptionFieldComponent,
    DescriptionHelpComponent,
    DeviantArtCategorySelectComponent,
    DeviantArtFoldersComponent,
    DeviantArtFormComponent,
    E621FormComponent,
    FaSpeciesSelectComponent,
    FormTemplateSelectComponent,
    FuraffinityFoldersComponent,
    FuraffinityFormComponent,
    FurifficFormComponent,
    FurryNetworkFormComponent,
    FurryNetworkProfileSelectComponent,
    HentaiFoundryCategorySelectComponent,
    HentaiFoundryFormComponent,
    InkbunnyFormComponent,
    MastodonFormComponent,
    OptionsSectionDirective,
    PaigeeWorldFormComponent,
    PatreonFormComponent,
    PixivFormComponent,
    PostybirbAppComponent,
    PostybirbPrimaryFormComponent,
    PostyBirbStatusBarComponent,
    Route50FormComponent,
    ScheduleSubmissionDialogComponent,
    SidebarNavigatorComponent,
    SofurryFoldersComponent,
    SofurryFormComponent,
    SubmissionEditingFormComponent,
    SubmissionRowComponent,
    SubmissionRuleHelpDialogComponent,
    SubmissionSettingsDialogComponent,
    SubmissionSheetComponent,
    SubmissionTableComponent,
    SubmissionViewComponent,
    TagFieldComponent,
    TumblrBlogSelectComponent,
    TumblrFormComponent,
    TwitterFormComponent,
    WeasylFoldersComponent,
    WeasylFormComponent,
    CopySubmissionSelectComponent,
    ManageTemplatesDialogComponent,
    SubmissionSaveDialogComponent,
    FurryAminoFormComponent,
    BulkSubmissionEditingFormComponent,
    BulkUpdateDialogComponent,
    NewgroundsFormComponent,
    TitleTruncateDisplayComponent,
  ],
  entryComponents: [
    AryionFormComponent,
    CreateTemplateDialogComponent,
    DerpibooruFormComponent,
    DeviantArtFormComponent,
    E621FormComponent,
    FuraffinityFormComponent,
    FurifficFormComponent,
    FurryNetworkFormComponent,
    HentaiFoundryFormComponent,
    InkbunnyFormComponent,
    MastodonFormComponent,
    PaigeeWorldFormComponent,
    PatreonFormComponent,
    PixivFormComponent,
    Route50FormComponent,
    ScheduleSubmissionDialogComponent,
    SofurryFormComponent,
    SubmissionRuleHelpDialogComponent,
    SubmissionSettingsDialogComponent,
    SubmissionSheetComponent,
    SubmissionViewComponent,
    TumblrFormComponent,
    TwitterFormComponent,
    WeasylFormComponent,
    FurryAminoFormComponent,
    ManageTemplatesDialogComponent,
    SubmissionSaveDialogComponent,
    BulkUpdateDialogComponent,
    NewgroundsFormComponent
  ],
  exports: [
    DescriptionFieldComponent,
    DescriptionHelpComponent,
    PostyBirbStatusBarComponent,
    TagFieldComponent,
    TumblrBlogSelectComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class PostybirbModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: PostybirbModule,
      providers: [PostManagerService, PostService, SchedulerService, TemplatesService]
    }
  }
}
