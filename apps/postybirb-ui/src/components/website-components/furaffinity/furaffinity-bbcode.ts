/* eslint-disable */
import { parse as parseUrl } from 'url';

// Based on https://github.com/FurAffinity/bbcode-js/blob/master/index.js

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------

export interface RenderOptions {
  automaticParagraphs?: boolean;
}

type TokenType =
  | 'TEXT'
  | 'OPEN_TAG'
  | 'CLOSE_TAG'
  | 'ICON_AND_USERNAME_LINK'
  | 'ICON_ONLY_LINK'
  | 'USERNAME_ONLY_LINK'
  | 'HORIZONTAL_RULE'
  | 'LINE_BREAK'
  | 'FORCED_LINE_BREAK'
  | 'FORCED_PARAGRAPH_BREAK'
  | 'AUTOMATIC_LINK'
  | 'SERIES_NAVIGATION';

interface BaseToken {
  type: TokenType;
  text: string;
}

interface TextToken extends BaseToken {
  type: 'TEXT';
}

interface OpenTagToken extends BaseToken {
  type: 'OPEN_TAG';
  name: string;
  value?: string; // for color, quote, url
}

interface CloseTagToken extends BaseToken {
  type: 'CLOSE_TAG';
  name: string;
}

interface IconAndUsernameLinkToken extends BaseToken {
  type: 'ICON_AND_USERNAME_LINK';
  username: string;
}

interface IconOnlyLinkToken extends BaseToken {
  type: 'ICON_ONLY_LINK';
  username: string;
}

interface UsernameOnlyLinkToken extends BaseToken {
  type: 'USERNAME_ONLY_LINK';
  username: string;
}

interface HorizontalRuleToken extends BaseToken {
  type: 'HORIZONTAL_RULE';
}

interface LineBreakToken extends BaseToken {
  type: 'LINE_BREAK';
}

interface ForcedLineBreakToken extends BaseToken {
  type: 'FORCED_LINE_BREAK';
}

interface ForcedParagraphBreakToken extends BaseToken {
  type: 'FORCED_PARAGRAPH_BREAK';
}

interface AutomaticLinkToken extends BaseToken {
  type: 'AUTOMATIC_LINK';
}

interface SeriesNavigationToken extends BaseToken {
  type: 'SERIES_NAVIGATION';
  previous: string;
  first: string;
  next: string;
}

type Token =
  | TextToken
  | OpenTagToken
  | CloseTagToken
  | IconAndUsernameLinkToken
  | IconOnlyLinkToken
  | UsernameOnlyLinkToken
  | HorizontalRuleToken
  | LineBreakToken
  | ForcedLineBreakToken
  | ForcedParagraphBreakToken
  | AutomaticLinkToken
  | SeriesNavigationToken;

const allowedProtocols = [null, 'http:', 'https:', 'mailto:', 'irc:', 'ircs:'];

const symbols: Record<string, string> = {
  c: '©',
  r: '®',
  tm: '™',
};

const unnestable = ['b', 'i', 's', 'u', 'url', 'h1', 'h2', 'h3', 'h4', 'h5'];

const maximumStackSize = 20;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const escapeAttributeValue = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&#34;');

const escapeContent = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const linkInfo = (uri: string): { allowed: boolean; internal: boolean } => {
  const info = parseUrl(uri);
  return {
    allowed: allowedProtocols.includes(info.protocol ?? null),
    internal:
      info.hostname === null ||
      /(?:^|\.)(?:furaffinity|facdn)\.net$/i.test(info.hostname),
  };
};

// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------

const CSS3_OPAQUE_COLOUR =
  /^(?:#?([\da-f]{3}|[\da-f]{6})|rgb\((?:(?:\s*(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\s*,){2}\s*(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\s*|(?:\s*(?:100|0?\d{1,2})%\s*,){2}\s*(?:100|0?\d{1,2})%\s*)\)|hsl\(\s*(?:180|1[0-7]\d|0?\d{1,2})\s*,\s*(?:100|0?\d{1,2})%\s*,\s*(?:100|0?\d{1,2})%\s*\)|black|silver|gr[ae]y|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|blanchedalmond|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgr[ae]y|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategr[ae]y|darkturquoise|darkviolet|deeppink|deepskyblue|dimgr[ae]y|dodgerblue|firebrick|floralwhite|forestgreen|gainsboro|ghostwhite|gold|goldenrod|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgr[ae]y|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategr[ae]y|lightsteelblue|lightyellow|limegreen|linen|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|oldlace|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|skyblue|slateblue|slategr[ae]y|snow|springgreen|steelblue|tan|thistle|tomato|turquoise|violet|wheat|whitesmoke|yellowgreen)$/i;

function tokenize(input: string): Token[] {
  const TOKEN = new RegExp(
    '\\[([bisu]|sub|sup|quote|left|center|right|h[1-5])\\]' +
      '|\\[/([bisu]|sub|sup|color|quote|left|center|right|url|h[1-5])\\]' +
      '|\\[(color|quote|url)=(?:"([^"]+)"|(\\S*?))\\]' +
      '|:(icon|link)([\\w-]+):' +
      '|:([\\w-]+)icon:' +
      '|(\\r?\\n?-{5,}\\r?\\n?)' +
      '|(\\r\\n|[\\r\\n\\u2028\\u2029])' +
      '|\\((c|r|tm)\\)' +
      '|(\\bhttps?:\\/\\/(?:[^\\s?!.,;[\\]]|[?!.,;]\\w)+)' +
      '|\\[(\\d+|-)\\s*,\\s*(\\d+|-)\\s*,\\s*(\\d+|-)\\]',
    'gi',
  );

  const tokens: Token[] = [];
  let end = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(input)) !== null) {
    const start = m.index;
    const text = m[0];

    if (start !== end) {
      tokens.push({ type: 'TEXT', text: input.substring(end, start) });
    }

    end = start + text.length;

    if (m[1] !== undefined) {
      tokens.push({ type: 'OPEN_TAG', name: m[1].toLowerCase(), text });
    } else if (m[2] !== undefined) {
      tokens.push({ type: 'CLOSE_TAG', name: m[2].toLowerCase(), text });
    } else if (m[3] !== undefined) {
      tokens.push({
        type: 'OPEN_TAG',
        name: m[3].toLowerCase(),
        value: m[4] !== undefined ? m[4] : m[5],
        text,
      });
    } else if (m[6] === 'icon') {
      tokens.push({ type: 'ICON_AND_USERNAME_LINK', username: m[7], text });
    } else if (m[6] === 'link') {
      tokens.push({ type: 'USERNAME_ONLY_LINK', username: m[7], text });
    } else if (m[8] !== undefined) {
      tokens.push({ type: 'ICON_ONLY_LINK', username: m[8], text });
    } else if (m[9] !== undefined) {
      tokens.push({ type: 'HORIZONTAL_RULE', text });
    } else if (m[10] === '\u2028') {
      tokens.push({ type: 'FORCED_LINE_BREAK', text });
    } else if (m[10] === '\u2029') {
      tokens.push({ type: 'FORCED_PARAGRAPH_BREAK', text });
    } else if (m[10] !== undefined) {
      tokens.push({ type: 'LINE_BREAK', text });
    } else if (m[11] !== undefined) {
      tokens.push({
        type: 'TEXT',
        text: symbols[m[11].toLowerCase()],
      });
    } else if (m[12] !== undefined) {
      tokens.push({ type: 'AUTOMATIC_LINK', text });
    } else if (m[13] !== undefined) {
      tokens.push({
        type: 'SERIES_NAVIGATION',
        previous: m[13],
        first: m[14],
        next: m[15],
        text,
      });
    }
  }

  if (end !== input.length) {
    tokens.push({ type: 'TEXT', text: input.substring(end) });
  }

  return tokens;
}

// -----------------------------------------------------------------------------
// Tag Transformations
// -----------------------------------------------------------------------------

interface Node {
  text: string | null;
  prev: Node | null;
  next: Node | null;
}

interface OpenTagInfo {
  token: OpenTagToken; // the opening tag token (has value)
  node: Node;
  closedOverBy: ClosedOverInfo[];
  redundant: boolean;
}

interface ClosedOverInfo {
  insertOpeningNodeBefore: Node;
  insertClosingNodeAfter: Node;
}

function transform(
  closes: OpenTagInfo,
  token: Token,
  startNode: Node,
  endNode: Node,
): boolean {
  const name = closes.token.name;

  switch (name) {
    case 'b':
    case 'i':
    case 'u':
    case 's':
    case 'sub':
    case 'sup':
      startNode.text = `<${name}>`;
      endNode.text = `</${name}>`;
      return true;

    case 'left':
    case 'center':
    case 'right':
      startNode.text = `<div style="text-align: ${name}">`;
      endNode.text = `</div>`;
      return true;

    case 'quote':
      startNode.text = '<blockquote>';
      const quotes = closes.token.value;
      if (quotes) {
        startNode.text += `<header><cite>${escapeContent(quotes)}</cite> wrote:</header> `;
      }
      endNode.text = '</blockquote>';
      return true;

    case 'url': {
      const urlValue = closes.token.value;
      if (!urlValue) {
        endNode.text = token.text;
        return false;
      }
      const info = linkInfo(urlValue);
      if (info.allowed) {
        startNode.text = `<a href="${escapeAttributeValue(urlValue)}${info.internal ? '">' : '" rel="external nofollow">'}`;
        endNode.text = '</a>';
        return true;
      }
      endNode.text = token.text;
      return false;
    }

    case 'color': {
      let colour = closes.token.value?.trim() ?? '';
      const m = CSS3_OPAQUE_COLOUR.exec(colour);
      if (m) {
        if (m[1] !== undefined) {
          colour = '#' + m[1];
        }
        startNode.text = `<span style="color: ${colour};">`;
        endNode.text = '</span>';
        return true;
      }
      endNode.text = token.text;
      return false;
    }

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5': {
      const level = name[1];
      startNode.text = `<h${level}>`;
      endNode.text = `</h${level}>`;
      return true;
    }

    default:
      throw new Error('Unexpected');
  }
}

// -----------------------------------------------------------------------------
// Renderer
// -----------------------------------------------------------------------------

function createSeriesLink(label: string, id: string): string {
  if (id === '-') return label;
  return `<a href="/submissions/${id}">${label}</a>`;
}

function createSeriesNavigation(token: SeriesNavigationToken): string {
  return `${createSeriesLink('&lt;&lt;&lt; PREV', token.previous)} | ${createSeriesLink('FIRST', token.first)} | ${createSeriesLink('NEXT &gt;&gt;&gt;', token.next)}`;
}

export function furaffinityBBCodeRenderToHTML(
  input: string,
  options?: RenderOptions,
): string {
  const automaticParagraphs = Boolean(options?.automaticParagraphs);

  const tokens = tokenize(input);
  const openTags: OpenTagInfo[] = [];
  const openTagNames: string[] = [];

  const head: Node = { text: null, prev: null, next: null };
  let tail: Node = { text: null, prev: head, next: null };
  head.next = tail;

  function append(text: string | null): Node {
    tail.text = text;
    tail = { text: null, prev: tail, next: null };
    tail.prev!.next = tail;
    return tail.prev!;
  }

  if (automaticParagraphs) {
    append('<p>');
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const name = (token as OpenTagToken | CloseTagToken).name;

    switch (token.type) {
      case 'TEXT':
        append(escapeContent(token.text));
        break;

      case 'OPEN_TAG': {
        if (openTags.length > maximumStackSize) {
          append(escapeContent(token.text));
          break;
        }

        const redundant =
          unnestable.includes(name) && openTagNames.includes(name);
        const openingNode = append(escapeContent(token.text));
        openTags.push({
          token: token as OpenTagToken,
          node: openingNode,
          closedOverBy: [],
          redundant,
        });
        openTagNames.push(name);
        break;
      }

      case 'CLOSE_TAG': {
        const closesIndex = openTagNames.lastIndexOf(name);
        if (closesIndex === -1) {
          append(token.text);
          break;
        }

        const closes = openTags[closesIndex];
        openTagNames.splice(closesIndex, 1);
        openTags.splice(closesIndex, 1);

        const closingNode = append(null);
        const afterClosingNode = append(null);

        if (closes.redundant) {
          closes.node.text = null;
        } else {
          transform(closes, token, closes.node, closingNode);
        }

        // Update tags that were closed over by this one
        for (let j = closesIndex; j < openTags.length; j++) {
          openTags[j].closedOverBy.push({
            insertOpeningNodeBefore: afterClosingNode,
            insertClosingNodeAfter: closingNode.prev!,
          });
        }

        // Apply closed‑over transformations with a dummy token (text won't be used)
        const dummyToken: TextToken = { type: 'TEXT', text: '' };
        for (const closedOverBy of closes.closedOverBy) {
          const newOpeningNode: Node = { text: null, prev: null, next: null };
          const newClosingNode: Node = { text: null, prev: null, next: null };
          if (transform(closes, dummyToken, newOpeningNode, newClosingNode)) {
            newOpeningNode.prev = closedOverBy.insertOpeningNodeBefore.prev;
            newOpeningNode.next = closedOverBy.insertOpeningNodeBefore;
            closedOverBy.insertOpeningNodeBefore.prev!.next = newOpeningNode;
            closedOverBy.insertOpeningNodeBefore.prev = newOpeningNode;

            newClosingNode.prev = closedOverBy.insertClosingNodeAfter;
            newClosingNode.next = closedOverBy.insertClosingNodeAfter.next;
            closedOverBy.insertClosingNodeAfter.next!.prev = newClosingNode;
            closedOverBy.insertClosingNodeAfter.next = newClosingNode;
          }
        }
        break;
      }

      case 'ICON_AND_USERNAME_LINK':
        append(
          generateHref(`/user/${token.username}/`, true) +
            `<img src="https://www.furaffinity.net/user/1424255659/${token.username}.gif">` +
            `${token.username}</a>`,
        );
        break;

      case 'USERNAME_ONLY_LINK':
        append(
          `${generateHref(`/user/${token.username}/`, true)}${token.username}</a>`,
        );
        break;

      case 'ICON_ONLY_LINK':
        append(
          generateHref(`/user/${token.username}/`, true) +
            `<img src="https://a.furaffinity.net/user/1424255659/${token.username}.gif">` +
            `</a>`,
        );
        break;

      case 'AUTOMATIC_LINK': {
        const info = linkInfo(token.text);
        if (info.allowed) {
          append(
            `${generateHref(token.text, info.internal)}${escapeContent(token.text)}</a>`,
          );
        } else {
          append(escapeContent(token.text));
        }
        break;
      }

      case 'HORIZONTAL_RULE':
        append('<hr>');
        break;

      case 'LINE_BREAK':
        if (automaticParagraphs) {
          let count = 1;
          while (i < tokens.length - 1 && tokens[i + 1].type === 'LINE_BREAK') {
            count++;
            i++;
          }
          if (count > 1) {
            append('</p>');
            append(new Array(count - 1).join('<br>'));
            append('<p>');
            break;
          }
        }
        append('<br>');
        break;

      case 'FORCED_LINE_BREAK':
        append('<br>');
        break;

      case 'FORCED_PARAGRAPH_BREAK':
        append('</p>');
        append('<p>');
        break;

      case 'SERIES_NAVIGATION':
        append(createSeriesNavigation(token));
        break;

      default:
        throw new Error(`Unrecognized token type: ${(token as Token).type}`);
    }
  }

  if (automaticParagraphs) {
    if (tail.prev!.text === '<p>') {
      tail.prev!.prev!.next = null;
    } else {
      append('</p>');
    }
  }

  let result = '';
  let node: Node | null = head;
  while ((node = node.next) != null) {
    if (node.text !== null) {
      result += node.text;
    }
  }
  return result;
}

function generateHref(href: string, internal: boolean) {
  return `<a href="${internal ? 'https://www.furaffinity.net/' : ''}${escapeAttributeValue(href)}${internal ? '" target="_blank" rel="external nofollow noopener noreferrer">' : '" target="_blank" rel="external nofollow noopener noreferrer">'}`;
}
