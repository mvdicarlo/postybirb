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
    [SupportedWebsites.Derpibooru]: ParseType.TEXT,
    [SupportedWebsites.DeviantArt]: ParseType.HTML,
    [SupportedWebsites.e621]: ParseType.TEXT,
    [SupportedWebsites.Furaffinity]: ParseType.BBCODE,
    [SupportedWebsites.Furiffic]: ParseType.BBCODE,
    [SupportedWebsites.FurryNetwork]: ParseType.MARKDOWN,
    [SupportedWebsites.Inkbunny]: ParseType.BBCODE,
    [SupportedWebsites.Pixiv]: ParseType.TEXT,
    [SupportedWebsites.Patreon]: ParseType.HTML,
    [SupportedWebsites.Route50]: ParseType.TEXT,
    [SupportedWebsites.SoFurry]: ParseType.BBCODE,
    [SupportedWebsites.Tumblr]: ParseType.HTML,
    [SupportedWebsites.Twitter]: ParseType.TEXT,
    [SupportedWebsites.Weasyl]: ParseType.HTML,
  };

  private adMapping: any = {
    [ParseType.BBCODE]: '\n[url=http://www.postybirb.com]Posted using PostyBirb[/url]',
    [ParseType.HTML]: '<br><a href="http://www.postybirb.com">Posted using PostyBirb</a>',
    [ParseType.MARKDOWN]: '\n[Posted using PostyBirb](http://www.postybirb.com)',
    [ParseType.TEXT]: '\nPosted using PostyBirb'
  }

  private codes: any = {
    da: {
      url: '.deviantart.com',
    },
    fn: {
      url: 'https://beta.furrynetwork.com/',
    },
    fr: {
      url: 'https://www.furiffic/',
    },
    fa: {
      url: 'https://www.furaffinity.net/user/',
    },
    icon: {
      url: 'https://www.furaffinity.net/user/',
    },
    ib: {
      url: 'https://www.inkbunny.net/',
    },
    pa: {
      url: 'https://www.patreon.com/'
    },
    pic: {
      url: 'https://www.picarto.tv/'
    },
    sf: {
      url: '.sofurry.net',
    },
    tu: {
      url: 'https://www.tumblr.com/blog/',
    },
    tw: {
      url: 'https://twitter.com/',
    },
    ws: {
      url: 'https://www.weasyl.com/~',
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
    parseObj.parsed = this.addAdvertisement(parseObj.parsed, website, type);

    return parseObj;
  }

  private addAdvertisement(text: string = '', website: string, type: ParseType): string {
    const enabled = store.get('globalAdvertise');
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

    for (const k in Object.keys(codes)) {
      const key = Object.keys(codes)[k];
      const matchedTags = newText.match(new RegExp(`:${key}.*?:`, 'gm'));
      if (matchedTags) {
        matchedTags.forEach((tag) => {

          if (website === SupportedWebsites.Furaffinity && tag.includes('icon:')) return; //skip :dausernameicon: issue

          const username = tag.substring(1 + key.length, tag.length - 1);
          let url = (key === 'da' || key === 'sf') ? `https://${username}${codes[key].url}` : codes[key].url + username;

          if (type === ParseType.BBCODE) {
            url = `[url=${url}]${username}[/url]`;
          } else if (type === ParseType.HTML) {
            url = `<a href="${url}" target="_blank">${username}</a>`;
          }

          newText = newText.replace(tag, url);
        });
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
    let newText = this.parser.process({ text: text, removeMisalignedTags: false, addInLineBreaks: true }).html;

    return newText.replace(/(>\n|>\r)/g, '');
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

    const extraTags = newText.match(/\[.*?(\])/g) || [];
    extraTags.forEach(tag => {
      if (!tag.toLowerCase().includes('url')) {
        newText = newText.replace(tag, '');
      }
    })

    const urlMatches = newText.match(/\[url=.*?\url\]/g) || [];

    urlMatches.forEach((urlTag) => {
      const url = urlTag.match(/=.*?(?=\])/g)[0].replace('=', '');
      const msg = urlTag.match(/\].*?(?=\[)/g)[0].replace(']', '');
      newText = newText.replace(urlTag, `[${msg}](${url})`);
    });

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

    urlMatches.forEach((urlTag) => {
      const url = urlTag.match(/=.*?(?=\])/g)[0].replace('=', '');
      const msg = urlTag.match(/\].*?(?=\[)/g)[0].replace(']', '');
      newText = newText.replace(urlTag, `${url} (${msg})`);
    });

    const quoteMatches = newText.match(/\[quote.*?\quote\]/g) || [];
    quoteMatches.forEach((quoteTag) => {
      const msg = quoteTag.match(/\].*?(?=\[)/g)[0].replace(']', '');
      newText = newText.replace(quoteTag, `"${msg}"`);
    });

    const otherTags = newText.match(/\[.*?\]/g) || [];
    otherTags.forEach((tag) => {
      newText = newText.replace(tag, '');
    });

    return newText;
  }

}
