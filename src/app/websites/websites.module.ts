import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { Aryion } from './website-services/aryion/aryion.service';
import { Derpibooru } from './website-services/derpibooru/derpibooru.service';
import { E621 } from './website-services/e621/e621.service';
import { FurAffinity } from './website-services/fur-affinity/fur-affinity.service';
import { Furiffic } from './website-services/furiffic/furiffic.service';
import { FurryAmino } from './website-services/furry-amino/furry-amino.service';
import { HentaiFoundry } from './website-services/hentai-foundry/hentai-foundry.service';
import { Newgrounds } from './website-services/newgrounds/newgrounds.service';
import { PaigeeWorld } from './website-services/paigee-world/paigee-world.service';
import { Patreon } from './website-services/patreon/patreon.service';
import { Pixiv } from './website-services/pixiv/pixiv.service';
import { Route50 } from './website-services/route50/route50.service';
import { SoFurry } from './website-services/sofurry/sofurry.service';
import { Weasyl } from './website-services/weasyl/weasyl.service';
import { InkBunny } from './website-services/inkbunny/inkbunny.service';
import { Twitter } from './website-services/twitter/twitter.service';
import { Tumblr } from './website-services/tumblr/tumblr.service';
import { DeviantArt } from './website-services/deviant-art/deviant-art.service';
import { FurryNetwork } from './website-services/furry-network/furry-network.service';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';

import { GenericLoginDialog } from './components/generic-login-dialog/generic-login-dialog.component';
import { BaseWebsiteSubmissionForm } from './components/base-website-submission-form/base-website-submission-form.component';
import { WeasylSubmissionForm } from './website-services/weasyl/components/weasyl-submission-form/weasyl-submission-form.component';
import { WebsiteSubmissionFormDisplayDirective } from './directives/website-submission-form-display.directive';
import { E621SubmissionForm } from './website-services/e621/components/e621-submission-form/e621-submission-form.component';
import { WebsiteDisplaynamePipe } from './pipes/website-displayname.pipe';
import { FurAffinitySubmissionForm } from './website-services/fur-affinity/components/fur-affinity-submission-form/fur-affinity-submission-form.component';
import { GenericJournalSubmissionForm } from './components/generic-journal-submission-form/generic-journal-submission-form.component';
import { GenericSubmissionForm } from './components/generic-submission-form/generic-submission-form.component';
import { NewgroundsSubmissionForm } from './website-services/newgrounds/components/newgrounds-submission-form/newgrounds-submission-form.component';
import { DerpibooruSubmissionForm } from './website-services/derpibooru/components/derpibooru-submission-form/derpibooru-submission-form.component';
import { FurryAminoSubmissionForm } from './website-services/furry-amino/components/furry-amino-submission-form/furry-amino-submission-form.component';
import { AryionSubmissionForm } from './website-services/aryion/components/aryion-submission-form/aryion-submission-form.component';
import { PaigeeWorldSubmissionForm } from './website-services/paigee-world/components/paigee-world-submission-form/paigee-world-submission-form.component';
import { SofurrySubmissionForm } from './website-services/sofurry/components/sofurry-submission-form/sofurry-submission-form.component';
import { HentaiFoundrySubmissionForm } from './website-services/hentai-foundry/components/hentai-foundry-submission-form/hentai-foundry-submission-form.component';
import { HentaiFoundryCategorySelectComponent } from './website-services/hentai-foundry/components/hentai-foundry-submission-form/hentai-foundry-category-select/hentai-foundry-category-select.component';
import { PixivSubmissionForm } from './website-services/pixiv/components/pixiv-submission-form/pixiv-submission-form.component';
import { PatreonSubmissionForm } from './website-services/patreon/components/patreon-submission-form/patreon-submission-form.component';
import { InkbunnyLoginDialog } from './website-services/inkbunny/components/inkbunny-login-dialog/inkbunny-login-dialog.component';
import { InkbunnySubmissionForm } from './website-services/inkbunny/components/inkbunny-submission-form/inkbunny-submission-form.component';
import { TwitterLoginDialog } from './website-services/twitter/components/twitter-login-dialog/twitter-login-dialog.component';
import { TwitterSubmissionForm } from './website-services/twitter/components/twitter-submission-form/twitter-submission-form.component';
import { TumblrLoginDialog } from './website-services/tumblr/components/tumblr-login-dialog/tumblr-login-dialog.component';
import { TumblrSubmissionForm } from './website-services/tumblr/components/tumblr-submission-form/tumblr-submission-form.component';
import { TumblrJournalForm } from './website-services/tumblr/components/tumblr-journal-form/tumblr-journal-form.component';
import { DeviantArtLoginDialog } from './website-services/deviant-art/components/deviant-art-login-dialog/deviant-art-login-dialog.component';
import { DeviantArtSubmissionForm } from './website-services/deviant-art/components/deviant-art-submission-form/deviant-art-submission-form.component';
import { DeviantArtCategorySelectComponent } from './website-services/deviant-art/components/deviant-art-submission-form/deviant-art-category-select/deviant-art-category-select.component';
import { FurryNetworkLoginDialog } from './website-services/furry-network/components/furry-network-login-dialog/furry-network-login-dialog.component';
import { FurryNetworkSubmissionForm } from './website-services/furry-network/components/furry-network-submission-form/furry-network-submission-form.component';
import { FurryNetworkJournalForm } from './website-services/furry-network/components/furry-network-journal-form/furry-network-journal-form.component';

export function INIT_WEBSITE_REGISTRY() {
  return () => {};
}

@NgModule({
  declarations: [
    AryionSubmissionForm,
    BaseWebsiteSubmissionForm,
    DerpibooruSubmissionForm,
    E621SubmissionForm,
    FurAffinitySubmissionForm,
    FurryAminoSubmissionForm,
    GenericJournalSubmissionForm,
    GenericLoginDialog,
    GenericSubmissionForm,
    HentaiFoundryCategorySelectComponent,
    HentaiFoundrySubmissionForm,
    InkbunnyLoginDialog,
    InkbunnySubmissionForm,
    NewgroundsSubmissionForm,
    PaigeeWorldSubmissionForm,
    PatreonSubmissionForm,
    PixivSubmissionForm,
    SofurrySubmissionForm,
    TwitterLoginDialog,
    TwitterSubmissionForm,
    WeasylSubmissionForm,
    WebsiteDisplaynamePipe,
    WebsiteSubmissionFormDisplayDirective,
    TumblrLoginDialog,
    TumblrSubmissionForm,
    TumblrJournalForm,
    DeviantArtLoginDialog,
    DeviantArtSubmissionForm,
    DeviantArtCategorySelectComponent,
    FurryNetworkLoginDialog,
    FurryNetworkSubmissionForm,
    FurryNetworkJournalForm
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    TranslateModule,
    UtilsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule
  ],
  exports: [
    WebsiteSubmissionFormDisplayDirective,
    WebsiteDisplaynamePipe
  ],
  entryComponents: [
    AryionSubmissionForm,
    DerpibooruSubmissionForm,
    E621SubmissionForm,
    FurAffinitySubmissionForm,
    FurryAminoSubmissionForm,
    GenericJournalSubmissionForm,
    GenericLoginDialog,
    GenericSubmissionForm,
    HentaiFoundrySubmissionForm,
    InkbunnyLoginDialog,
    InkbunnySubmissionForm,
    NewgroundsSubmissionForm,
    PaigeeWorldSubmissionForm,
    PatreonSubmissionForm,
    PixivSubmissionForm,
    SofurrySubmissionForm,
    TwitterLoginDialog,
    TwitterSubmissionForm,
    WeasylSubmissionForm,
    TumblrLoginDialog,
    TumblrSubmissionForm,
    TumblrJournalForm,
    DeviantArtLoginDialog,
    DeviantArtSubmissionForm,
    FurryNetworkLoginDialog,
    FurryNetworkSubmissionForm,
    FurryNetworkJournalForm
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        Aryion,
        Derpibooru,
        E621,
        FurAffinity,
        Furiffic,
        FurryAmino,
        HentaiFoundry,
        InkBunny,
        Newgrounds,
        PaigeeWorld,
        Patreon,
        Pixiv,
        Route50,
        SoFurry,
        Tumblr,
        Twitter,
        Weasyl,
        DeviantArt,
        FurryNetwork
      ],
      multi: true
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsitesModule { }
