import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AfterDark } from './website-services/afterdark/afterdark.service';
import { Aryion } from './website-services/aryion/aryion.service';
import { Derpibooru } from './website-services/derpibooru/derpibooru.service';
import { DeviantArt } from './website-services/deviant-art/deviant-art.service';
import { Discord } from './website-services/discord/discord.service';
import { E621 } from './website-services/e621/e621.service';
import { FurAffinity } from './website-services/fur-affinity/fur-affinity.service';
import { Furiffic } from './website-services/furiffic/furiffic.service';
import { FurryLife } from './website-services/furry-life/furry-life.service';
import { FurryNetwork } from './website-services/furry-network/furry-network.service';
import { HentaiFoundry } from './website-services/hentai-foundry/hentai-foundry.service';
import { InkBunny } from './website-services/inkbunny/inkbunny.service';
import { KoFi } from './website-services/ko-fi/ko-fi.service';
import { Manebooru } from './website-services/manebooru/manebooru.service';
import { Mastodon } from './website-services/mastodon/mastodon.service';
import { Newgrounds } from './website-services/newgrounds/newgrounds.service';
import { NewTumbl } from './website-services/new-tumbl/new-tumbl.service';
import { Patreon } from './website-services/patreon/patreon.service';
import { Piczel } from './website-services/piczel/piczel.service';
import { Pixiv } from './website-services/pixiv/pixiv.service';
import { SoFurry } from './website-services/sofurry/sofurry.service';
import { Tumblr } from './website-services/tumblr/tumblr.service';
import { Twitter } from './website-services/twitter/twitter.service';
import { Weasyl } from './website-services/weasyl/weasyl.service';
import { Pillowfort } from './website-services/pillowfort/pillowfort.service';

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
  MatRadioModule,
  MatSelectModule,
  MatTabsModule,
  MatTooltipModule
} from '@angular/material';

import { AfterDarkSubmissionForm } from './website-services/afterdark/components/afterdark-submission-form/afterdark-submission-form.component';
import { AryionSubmissionForm } from './website-services/aryion/components/aryion-submission-form/aryion-submission-form.component';
import { BaseWebsiteSubmissionForm } from './components/base-website-submission-form/base-website-submission-form.component';
import { DerpibooruSubmissionForm } from './website-services/derpibooru/components/derpibooru-submission-form/derpibooru-submission-form.component';
import { DeviantArtLoginDialog } from './website-services/deviant-art/components/deviant-art-login-dialog/deviant-art-login-dialog.component';
import { DeviantArtSubmissionForm } from './website-services/deviant-art/components/deviant-art-submission-form/deviant-art-submission-form.component';
import { E621SubmissionForm } from './website-services/e621/components/e621-submission-form/e621-submission-form.component';
import { FurAffinitySubmissionForm } from './website-services/fur-affinity/components/fur-affinity-submission-form/fur-affinity-submission-form.component';
import { FurryNetworkJournalForm } from './website-services/furry-network/components/furry-network-journal-form/furry-network-journal-form.component';
import { FurryNetworkSubmissionForm } from './website-services/furry-network/components/furry-network-submission-form/furry-network-submission-form.component';
import { GenericJournalSubmissionForm } from './components/generic-journal-submission-form/generic-journal-submission-form.component';
import { GenericLoginDialog } from './components/generic-login-dialog/generic-login-dialog.component';
import { GenericSubmissionForm } from './components/generic-submission-form/generic-submission-form.component';
import { HentaiFoundryCategorySelectComponent } from './website-services/hentai-foundry/components/hentai-foundry-submission-form/hentai-foundry-category-select/hentai-foundry-category-select.component';
import { HentaiFoundrySubmissionForm } from './website-services/hentai-foundry/components/hentai-foundry-submission-form/hentai-foundry-submission-form.component';
import { InkbunnyLoginDialog } from './website-services/inkbunny/components/inkbunny-login-dialog/inkbunny-login-dialog.component';
import { InkbunnySubmissionForm } from './website-services/inkbunny/components/inkbunny-submission-form/inkbunny-submission-form.component';
import { KoFiSubmissionForm } from './website-services/ko-fi/components/ko-fi-submission-form/ko-fi-submission-form.component';
import { ManebooruSubmissionForm } from './website-services/manebooru/components/manebooru-submission-form/manebooru-submission-form.component';
import { MastodonLoginDialog } from './website-services/mastodon/components/mastodon-login-dialog/mastodon-login-dialog.component';
import { MastodonSubmissionForm } from './website-services/mastodon/components/mastodon-submission-form/mastodon-submission-form.component';
import { NewgroundsSubmissionForm } from './website-services/newgrounds/components/newgrounds-submission-form/newgrounds-submission-form.component';
import { PatreonSubmissionForm } from './website-services/patreon/components/patreon-submission-form/patreon-submission-form.component';
import { PixivSubmissionForm } from './website-services/pixiv/components/pixiv-submission-form/pixiv-submission-form.component';
import { SofurrySubmissionForm } from './website-services/sofurry/components/sofurry-submission-form/sofurry-submission-form.component';
import { TumblrLoginDialog } from './website-services/tumblr/components/tumblr-login-dialog/tumblr-login-dialog.component';
import { TumblrSubmissionForm } from './website-services/tumblr/components/tumblr-submission-form/tumblr-submission-form.component';
import { TwitterLoginDialog } from './website-services/twitter/components/twitter-login-dialog/twitter-login-dialog.component';
import { TwitterSubmissionForm } from './website-services/twitter/components/twitter-submission-form/twitter-submission-form.component';
import { WeasylSubmissionForm } from './website-services/weasyl/components/weasyl-submission-form/weasyl-submission-form.component';
import { WebsiteDisplaynamePipe } from './pipes/website-displayname.pipe';
import { WebsiteSubmissionFormDisplayDirective } from './directives/website-submission-form-display.directive';
import { PiczelSubmissionForm } from './website-services/piczel/components/piczel-submission-form/piczel-submission-form.component';
import { DiscordLoginDialog } from './website-services/discord/components/discord-login-dialog/discord-login-dialog.component';
import { DiscordSubmissionForm } from './website-services/discord/components/discord-submission-form/discord-submission-form.component';
import { FurAffinityJournalForm } from './website-services/fur-affinity/components/fur-affinity-journal-form/fur-affinity-journal-form.component';
import { FurryLifeSubmissionForm } from './website-services/furry-life/components/furry-life-submission-form/furry-life-submission-form.component';
import { NewTumblSubmissionForm } from './website-services/new-tumbl/components/new-tumbl-submission-form/new-tumbl-submission-form.component';
import { E621LoginDialog } from './website-services/e621/components/e621-login-dialog/e621-login-dialog.component';
import { WebsiteRestrictionsDialog } from './components/website-restrictions-dialog/website-restrictions-dialog.component';
import { Subscribestar } from './website-services/subscribestar/subscribestar.service';
import { SubscribestarSubmissionForm } from './website-services/subscribestar/components/subscribestar-submission-form/subscribestar-submission-form.component';
import { PillowfortSubmissionForm } from './website-services/pillowfort/components/pillowfort-submission-form/pillowfort-submission-form.component';
import { FurbooruSubmissionForm } from './website-services/furbooru/components/furbooru-submission-form/furbooru-submission-form.component';
import { Furbooru } from './website-services/furbooru/furbooru.service';

export function INIT_WEBSITE_REGISTRY() {
  return () => {};
}

@NgModule({
  declarations: [
    AfterDarkSubmissionForm,
    AryionSubmissionForm,
    BaseWebsiteSubmissionForm,
    DerpibooruSubmissionForm,
    DeviantArtLoginDialog,
    DeviantArtSubmissionForm,
    E621SubmissionForm,
    FurAffinitySubmissionForm,
    FurbooruSubmissionForm,
    FurryNetworkJournalForm,
    FurryNetworkSubmissionForm,
    GenericJournalSubmissionForm,
    GenericLoginDialog,
    GenericSubmissionForm,
    HentaiFoundryCategorySelectComponent,
    HentaiFoundrySubmissionForm,
    InkbunnyLoginDialog,
    InkbunnySubmissionForm,
    KoFiSubmissionForm,
    ManebooruSubmissionForm,
    MastodonLoginDialog,
    MastodonSubmissionForm,
    NewgroundsSubmissionForm,
    PatreonSubmissionForm,
    PixivSubmissionForm,
    SofurrySubmissionForm,
    TumblrLoginDialog,
    TumblrSubmissionForm,
    TwitterLoginDialog,
    TwitterSubmissionForm,
    WeasylSubmissionForm,
    WebsiteDisplaynamePipe,
    WebsiteSubmissionFormDisplayDirective,
    PiczelSubmissionForm,
    DiscordLoginDialog,
    DiscordSubmissionForm,
    FurAffinityJournalForm,
    FurryLifeSubmissionForm,
    NewTumblSubmissionForm,
    E621LoginDialog,
    WebsiteRestrictionsDialog,
    SubscribestarSubmissionForm,
    PillowfortSubmissionForm,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    TranslateModule,
    UtilsModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule
  ],
  exports: [
    WebsiteDisplaynamePipe,
    WebsiteSubmissionFormDisplayDirective,
  ],
  entryComponents: [
    AfterDarkSubmissionForm,
    AryionSubmissionForm,
    DerpibooruSubmissionForm,
    DeviantArtLoginDialog,
    DeviantArtSubmissionForm,
    DiscordLoginDialog,
    DiscordSubmissionForm,
    E621LoginDialog,
    E621SubmissionForm,
    FurAffinityJournalForm,
    FurAffinitySubmissionForm,
    FurbooruSubmissionForm,
    // FurryLifeSubmissionForm,
    FurryNetworkJournalForm,
    FurryNetworkSubmissionForm,
    GenericJournalSubmissionForm,
    GenericLoginDialog,
    GenericSubmissionForm,
    HentaiFoundrySubmissionForm,
    InkbunnyLoginDialog,
    InkbunnySubmissionForm,
    KoFiSubmissionForm,
    ManebooruSubmissionForm,
    MastodonLoginDialog,
    MastodonSubmissionForm,
    NewgroundsSubmissionForm,
    NewTumblSubmissionForm,
    PatreonSubmissionForm,
    PiczelSubmissionForm,
    PixivSubmissionForm,
    PillowfortSubmissionForm,
    SofurrySubmissionForm,
    SubscribestarSubmissionForm,
    TumblrLoginDialog,
    TumblrSubmissionForm,
    TwitterLoginDialog,
    TwitterSubmissionForm,
    WeasylSubmissionForm,
    WebsiteRestrictionsDialog,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        AfterDark,
        Aryion,
        Derpibooru,
        DeviantArt,
        Discord,
        E621,
        FurAffinity,
        Furbooru,
        Furiffic,
        // FurryLife,
        FurryNetwork,
        HentaiFoundry,
        InkBunny,
        KoFi,
        Manebooru,
        Mastodon,
        Newgrounds,
        NewTumbl,
        Patreon,
        Piczel,
        Pillowfort,
        Pixiv,
        SoFurry,
        Subscribestar,
        Tumblr,
        Twitter,
        Weasyl,
      ],
      multi: true
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsitesModule { }
