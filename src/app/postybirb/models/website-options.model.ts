import { SupportedWebsites } from '../../commons/enums/supported-websites';
import { AryionFormComponent } from '../components/website-options/aryion-form/aryion-form.component';
import { DerpibooruFormComponent } from '../components/website-options/derpibooru-form/derpibooru-form.component';
import { DeviantArtFormComponent } from '../components/website-options/deviant-art-form/deviant-art-form.component';
import { E621FormComponent } from '../components/website-options/e621-form/e621-form.component';
import { FuraffinityFormComponent } from '../components/website-options/furaffinity-form/furaffinity-form.component';
import { FurifficFormComponent } from '../components/website-options/furiffic-form/furiffic-form.component';
import { FurryAminoFormComponent } from '../components/website-options/furry-amino-form/furry-amino-form.component';
import { FurryNetworkFormComponent } from '../components/website-options/furry-network-form/furry-network-form.component';
import { HentaiFoundryFormComponent } from '../components/website-options/hentai-foundry-form/hentai-foundry-form.component';
import { InkbunnyFormComponent } from '../components/website-options/inkbunny-form/inkbunny-form.component';
import { MastodonFormComponent } from '../components/website-options/mastodon-form/mastodon-form.component';
import { PaigeeWorldFormComponent } from '../components/website-options/paigee-world-form/paigee-world-form.component';
import { PatreonFormComponent } from '../components/website-options/patreon-form/patreon-form.component';
import { PixivFormComponent } from '../components/website-options/pixiv-form/pixiv-form.component';
import { Route50FormComponent } from '../components/website-options/route50-form/route50-form.component';
import { SofurryFormComponent } from '../components/website-options/sofurry-form/sofurry-form.component';
import { TumblrFormComponent } from '../components/website-options/tumblr-form/tumblr-form.component';
import { TwitterFormComponent } from '../components/website-options/twitter-form/twitter-form.component';
import { WeasylFormComponent } from '../components/website-options/weasyl-form/weasyl-form.component';
import { NewgroundsFormComponent } from '../components/website-options/newgrounds-form/newgrounds-form.component';

const OptionsForms: any = {
  [SupportedWebsites.Aryion]: {
    component: AryionFormComponent,
    requiredFields: ['reqtag']
  },
  [SupportedWebsites.Derpibooru]: {
    component: DerpibooruFormComponent
  },
  [SupportedWebsites.DeviantArt]: {
    component: DeviantArtFormComponent
  },
  [SupportedWebsites.e621]: {
    component: E621FormComponent
  },
  [SupportedWebsites.Furaffinity]: {
    component: FuraffinityFormComponent
  },
  [SupportedWebsites.Furiffic]: {
    component: FurifficFormComponent,
    exclude: true
  },
  [SupportedWebsites.FurryAmino]: {
    component: FurryAminoFormComponent,
  },
  [SupportedWebsites.FurryNetwork]: {
    component: FurryNetworkFormComponent
  },
  [SupportedWebsites.HentaiFoundry]: {
    component: HentaiFoundryFormComponent
  },
  [SupportedWebsites.Inkbunny]: {
    component: InkbunnyFormComponent
  },
  [SupportedWebsites.Mastodon]: {
    component: MastodonFormComponent
  },
  [SupportedWebsites.Newgrounds]: {
    component: NewgroundsFormComponent,
    requiredFields: ['nudity', 'violence', 'text', 'adult']
  },
  [SupportedWebsites.PaigeeWorld]: {
    component: PaigeeWorldFormComponent
  },
  [SupportedWebsites.Patreon]: {
    component: PatreonFormComponent
  },
  [SupportedWebsites.Pixiv]: {
    component: PixivFormComponent
  },
  [SupportedWebsites.Route50]: {
    component: Route50FormComponent,
    exclude: true
  },
  [SupportedWebsites.SoFurry]: {
    component: SofurryFormComponent
  },
  [SupportedWebsites.Tumblr]: {
    component: TumblrFormComponent
  },
  [SupportedWebsites.Twitter]: {
    component: TwitterFormComponent
  },
  [SupportedWebsites.Weasyl]: {
    component: WeasylFormComponent
  }
};

export { OptionsForms }
