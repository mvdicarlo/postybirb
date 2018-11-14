import { SupportedWebsites } from '../enums/supported-websites';
import { ParseType } from '../enums/parse-type.enum';
import * as BBCodeParser from 'epochtalk-bbcode-parser';

interface ParseObject {
  original: string;
  parsed: string;
  type: ParseType;
  website: string;
}

/**
 * Parser used to parsing BBCode to other formats (limited & a little buggy)
 */
export class BbCodeParse {
  private parser: any;
  private mapping: any = {
    [SupportedWebsites.Aryion]: ParseType.TEXT,
    [SupportedWebsites.Derpibooru]: ParseType.TEXT,
    [SupportedWebsites.DeviantArt]: ParseType.HTML,
    [SupportedWebsites.e621]: ParseType.TEXT,
    [SupportedWebsites.Furaffinity]: ParseType.BBCODE,
    [SupportedWebsites.Furiffic]: ParseType.BBCODE,
    [SupportedWebsites.FurryAmino]: ParseType.TEXT,
    [SupportedWebsites.FurryNetwork]: ParseType.MARKDOWN,
    [SupportedWebsites.HentaiFoundry]: ParseType.BBCODE,
    [SupportedWebsites.Inkbunny]: ParseType.BBCODE,
    [SupportedWebsites.Mastodon]: ParseType.TEXT,
    [SupportedWebsites.Pixiv]: ParseType.TEXT,
    [SupportedWebsites.Patreon]: ParseType.HTML,
    [SupportedWebsites.PaigeeWorld]: ParseType.TEXT,
    [SupportedWebsites.Route50]: ParseType.TEXT,
    [SupportedWebsites.SoFurry]: ParseType.HTML,
    [SupportedWebsites.Tumblr]: ParseType.HTML,
    [SupportedWebsites.Twitter]: ParseType.TEXT,
    [SupportedWebsites.Weasyl]: ParseType.HTML,
  };

  private adMapping: any = {
    [ParseType.BBCODE]: '\n\n[url=http://www.postybirb.com]Posted using PostyBirb[/url]',
    [ParseType.HTML]: '<br><br><a href="http://www.postybirb.com">Posted using PostyBirb</a>',
    [ParseType.MARKDOWN]: '\n\n[Posted using PostyBirb](http://www.postybirb.com)',
    [ParseType.TEXT]: '\n\nPosted using PostyBirb'
  }

  private codes: any = {
    da: {
      url: 'https://deviantart.com/',
    },
    fn: {
      url: 'https://beta.furrynetwork.com/',
    },
    fr: {
      url: 'https://furiffic.com/',
    },
    fa: {
      url: 'https://furaffinity.net/user/',
    },
    hf: {
      url: 'https://www.hentai-foundry.com/user/',
    },
    icon: {
      url: 'https://furaffinity.net/user/',
    },
    ib: {
      url: 'https://www.inkbunny.net/',
    },
    ma: {
      url: 'https://mastodon.social/'
    },
    pa: {
      url: 'https://patreon.com/'
    },
    pic: {
      url: 'https://picarto.tv/'
    },
    pw: {
      url: 'https://paigeeworld.com/u/'
    },
    sf: {
      url: '.sofurry.net',
    },
    tu: {
      url: 'https://tumblr.com/blog/',
    },
    tw: {
      url: 'https://twitter.com/',
    },
    ws: {
      url: 'https://weasyl.com/~',
    },
  };

  constructor() {
    this.parser = BBCodeParser;
  }

  /**
   * @function parse
   * @description This function parses a provided string into either markdown (limited), html, text, or BBCode
   * Input is assumed to be BBCode
   * @param {string} text - the text to be converted
   * @param {string} website - the website it is being converted for
   * @return {ParseObject}
   */
  public parse(text: string, website: string, onlyShortcuts: boolean = false): ParseObject {
    const type: ParseType = this.mapping[website];
    const parseObj: ParseObject = {
      original: (text || '').replace('[url=http://www.postybirb.com]Posted using PostyBirb[/url]', ''),
      parsed: null,
      type,
      website
    };

    if (!onlyShortcuts) {
      parseObj.original = parseObj.original
        .replace(/\[center\]/g, '\n[center]').replace(/\[\/center\]/g, '[/center]\n')
        .replace(/\[right\]/g, '\n[right]').replace(/\[\/right\]/g, '[/right]\n')
        .replace(/\[left\]/g, '\n[left]').replace(/\[\/left\]/g, '[/left]\n');

      switch (type) {
        case ParseType.BBCODE:
          parseObj.parsed = this.parseBBCode(parseObj.original);
          break;
        case ParseType.HTML:
          parseObj.parsed = this.parseHTML(parseObj.original);
          break;
        case ParseType.TEXT:
          parseObj.parsed = this.parseText(parseObj.original);
          break;
        case ParseType.MARKDOWN:
          parseObj.parsed = this.parseMarkdown(parseObj.original);
          break;
        default:
          parseObj.parsed = this.parseText(parseObj.original);
          break;
      }
    } else {
      parseObj.parsed = parseObj.original;
    }

    parseObj.parsed = this.parseWebsiteLinks(parseObj.parsed, parseObj.website, parseObj.type).replace(' style="white-space:pre;"', '');

    if (website !== SupportedWebsites.e621 && website !== SupportedWebsites.Derpibooru) {
      parseObj.parsed = this.addAdvertisement(parseObj.parsed, website, type);
    } else {
      parseObj.parsed = parseObj.parsed.replace('Posted using PostyBirb', '').replace('http://www.postybirb.com', ''); // extra check to remove the ad if it slipped in
    }

    if (!onlyShortcuts) {
      parseObj.parsed = this.customWebsiteParsing(parseObj.parsed, website);
    }

    return parseObj;
  }

  private addAdvertisement(text: string = '', website: string, type: ParseType): string {
    const enabled = db.get('globalAdvertise').value();
    const append: boolean = enabled === undefined ? true : enabled;

    let newText: string = text;

    if (append) {
      if (website === SupportedWebsites.Twitter) {
        if (text.length + this.adMapping[ParseType.TEXT].length <= 280) {
          newText += this.adMapping[ParseType.TEXT];
        }
      } else {
        newText += this.adMapping[type];
      }
    }

    return newText;
  }

  /**
   * @function customWebsiteParsing
   * @description handle and strip out or replace things that are specific to certain websites
   * @param {string} text - the text to be transformed
   * @param website - the website being transformed
   * @return {string}
   */
  private customWebsiteParsing(text: string, website: string): string {
    let newText = text;

    if (website === SupportedWebsites.Furaffinity) {
      newText = newText.replace(/(\[size=\d+\]|\[\/size\])/g, ''); // does not support our size tag
      newText = newText.replace(/\[hr\]/g, '\n-----\n');
    }

    if (website === SupportedWebsites.Furiffic) {
      newText = newText.replace(/\n/g, '[lb]\n');
      newText = newText.replace(/(\[size=\d+\]|\[\/size\])/g, ''); // does not support our size tag
      newText = newText
        .replace(/\[right\]/g, '[align=right]')
        .replace(/\[center\]/g, '[align=center]')
        .replace(/(\[\/center\]|\[\/right\])/g, '[/align]');
    }

    if (website === SupportedWebsites.DeviantArt || website === SupportedWebsites.Patreon) {
      newText = newText.replace(/\n/g, '');
      newText = newText.replace(/<del>/g, '<strike>').replace(/<\/del>/g, '</strike>');
    }

    if (website === SupportedWebsites.Patreon) {
      newText = newText.replace(/\n/g, '');
    }

    if (website === SupportedWebsites.Weasyl) {
      newText = newText.replace(/\n/g, '');
      newText = newText
        .replace(/align="center"/g, 'class="align-center"')
        .replace(/style="text-align: right;"/g, 'class="align-right"');
    }

    return newText;
  }

  /**
   * @function parseWebsiteLinks
   * @description transforms the shortcut website names (e.g. :icon:) into what makes sense for each website
   * @param {string} text - the text to be transformed
   * @param {string} website - the website being transformed for
   * @param {ParseType} type - the parse type it should be output as
   * @return {string}
   */
  private parseWebsiteLinks(text: string, website: string, type: ParseType): string {
    const codes = Object.assign({}, this.codes);

    let newText = text;

    if (website === SupportedWebsites.Furaffinity) {
      delete codes.icon;
      newText = newText.replace(/:fa/g, ':icon');
    }

    if (website === SupportedWebsites.DeviantArt) {
      delete codes.icon;
      newText = newText.replace(/:da/g, ':icon');
    }

    const keys = Object.keys(codes);

    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const matchedTags = newText.match(new RegExp(`:${key}.*?:`, 'gm')) || [];
      for (let i = 0; i < matchedTags.length; i++) {
        let tag = matchedTags[i];
        if (website === SupportedWebsites.Furaffinity && tag.includes('icon:')) return; //skip :dausernameicon: issue

        let username = tag.substring(1 + key.length, tag.length - 1);
        if (key === 'tw' || key === 'ma') {
          username = `${username}`; // @ symbol causes some issues
        }

        let url = (key === 'sf') ? `https://${username}${codes[key].url}` : codes[key].url + username;

        if (type === ParseType.BBCODE) {
          if (website === SupportedWebsites.Inkbunny) {
            if (key === 'da' || key === 'fa' || key === 'sf') {
              url = `[${key}]${username}[/${key}]`;
            } else if (key === 'ws') {
              url = `[w]${username}[/w]`;
            } else if (key === 'ib') {
              url = `[iconname]${username}[/iconname]`;
            } else {
              url = `[url=${url}]${username}[/url]`;
            }
          } else {
            url = `[url=${url}]${username}[/url]`;
          }
        } else if (type === ParseType.HTML) {
          if (website === SupportedWebsites.Weasyl && key === 'ws') {
            url = `<!~${username}>`; // https://www.weasyl.com/help/markdown
          } else {
            url = `<a href="${url}" target="_blank">${username}</a>`;
          }
        } else if (type === ParseType.MARKDOWN) {
          url = `[${username}](${url})`;
        }

        newText = newText.replace(tag, url);
      }
    }

    return newText;
  }

  /**
   * @function parseHTML
   * @description Transforms the bbcode text to html
   * @param {string} text - text to be transformed
   * @return {string} transformed text as HTML
   */
  private parseHTML(text: string): string {
    let convertText = text; // need to convert size to pt
    const sizeMatches = convertText.match(/\[size=\d+\]/g) || [];
    for (let i = 0; i < sizeMatches.length; i++) {
      const match = sizeMatches[i];
      const size = match.match(/\d+/g);
      convertText = convertText.replace(match, `[size=${size}pt]`);
    }

    let newText = this.parser.process({ text: convertText, removeMisalignedTags: false, addInLineBreaks: true }).html;
    newText = newText.substr(0, newText.length - 6); // strip out random div tag
    newText = newText.replace(/ class=".*?(?=")"/g, ''); // Strip out added in classes that have no use at all replace(/ class=".*?(?= )/g, '')
    newText = newText.replace('<div style="white-space:pre;">', ''); // strip out random div at the start
    newText = newText.replace(/align="center"/g, 'style="text-align: center" align="center"');
    newText = newText.replace(/\n/g, '\n<br>');
    newText = newText.replace(/\[hr\]/g, '<hr>');

    return newText;
  }

  private parseBBCode(text: string): string {
    return text;
  }

  /**
   * @function parseMarkdown
   * @description Lazily attempts to format SOME markdown elements. It doesn't work too well given some overlap in markdown and bbcode
   * @param {string} text - text to be transformed
   * @return {string} transformed text as markdown
   */
  private parseMarkdown(text: string): string {
    let newText = text;
    newText = newText.replace(/(\[(b|B)\]|\[\/(b|B)\])/g, '**');
    newText = newText.replace(/(\[(i|I)\]|\[\/(i|I)\])/g, '*');
    newText = newText.replace(/(\[(s|S)\]|\[\/(s|S)\])/g, '~~');
    newText = newText.replace(/\[hr\]/g, '\n-----\n');

    const extraTags = newText.match(/\[.*?(\])/g) || [];
    for (let i = 0; i < extraTags.length; i++) {
      const tag = extraTags[i];
      if (!tag.toLowerCase().includes('url')) {
        newText = newText.replace(tag, '');
      }
    }

    const urlMatches = newText.match(/\[url=.*?\url\]/g) || [];
    for (let i = 0; i < urlMatches.length; i++) {
      const urlTag = urlMatches[i];
      const url = urlTag.match(/=.*?(?=\])/g)[0].replace('=', '');
      const msg = urlTag.match(/\].*?(?=\[)/g)[0].replace(']', '');
      newText = newText.replace(urlTag, `[${msg}](${url})`);
    }

    return newText;
  }

  /**
   * @function parseText
   * @description attempts to convert BBCode to plain text by stripping out tags and urls into other format
   * @param {string} text- text to be transformed
   * @return transformed text as plain text
   */
  private parseText(text: string): string {
    let newText = text;
    const urlMatches = newText.match(/\[url=.*?\url\]/g) || [];
    for (let i = 0; i < urlMatches.length; i++) {
      const urlTag = urlMatches[i];
      const url = urlTag.match(/=.*?(?=\])/g)[0].replace('=', '');
      const msg = urlTag.match(/\].*?(?=\[)/g)[0].replace(']', '');
      newText = newText.replace(urlTag, url == msg ? url : `${url} (${msg})`);
    }

    const otherTags = newText.match(/\[.*?\]/g) || [];
    for (let i = 0; i < otherTags.length; i++) {
      newText = newText.replace(otherTags[i], '');
    }

    return newText;
  }

  public static guessBBCodeCount(text: string): number {
    if (!text) return 0;

    let estimate = text;

    const bbcodeTags = text.match(/\[.*?(\[\/.*?(\]))/g) || [];
    for (let i = 0; i < bbcodeTags.length; i++) {
      const bbcodeTag = bbcodeTags[i];
      const urlMatch = bbcodeTag.match(/url=.*?(?=\])/) || [];
      if (urlMatch.length > 0) {
        estimate = estimate.replace(bbcodeTag, urlMatch[0].replace('url=', ''));
      } else {
        estimate = estimate.replace(bbcodeTag, bbcodeTag.replace(/\[.*?(\])/g, ''));
      }
    }

    return estimate.replace(/\[.*?(\])/g, '').length;;
  }

}
