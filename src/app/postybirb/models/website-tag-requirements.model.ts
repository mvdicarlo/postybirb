import { SupportedWebsites } from '../../commons/enums/supported-websites';

const TagRequirements: any = {
  [SupportedWebsites.Aryion]: {
    minTags: 1
  },
  [SupportedWebsites.Derpibooru]: {
    minTags: 3
  },
  [SupportedWebsites.DeviantArt]: {

  },
  [SupportedWebsites.e621]: {
    minTags: 4
  },
  [SupportedWebsites.Furaffinity]: {
    maxLength: 250
  },
  [SupportedWebsites.Furiffic]: {
    maxTags: 30
  },
  [SupportedWebsites.FurryAmino]: {
    exclude: true
  },
  [SupportedWebsites.FurryNetwork]: {
    maxTags: 30,
    minCharacterLength: 3
  },
  [SupportedWebsites.HentaiFoundry]: {
    maxLength: 75
  },
  [SupportedWebsites.Inkbunny]: {

  },
  [SupportedWebsites.Mastodon]: {
    exclude: true
  },
  [SupportedWebsites.PaigeeWorld]: {

  },
  [SupportedWebsites.Patreon]: {
    maxTags: 5
  },
  [SupportedWebsites.Pixiv]: {
    minCharacterLength: 1,
    maxtags: 10,
    minTags: 1
  },
  [SupportedWebsites.Route50]: {

  },
  [SupportedWebsites.SoFurry]: {
    minTags: 2
  },
  [SupportedWebsites.Tumblr]: {

  },
  [SupportedWebsites.Twitter]: {
    exclude: true
  },
  [SupportedWebsites.Weasyl]: {
    minTags: 2
  }
};

export { TagRequirements }
