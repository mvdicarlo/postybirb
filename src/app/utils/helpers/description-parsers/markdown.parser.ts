import Turndown from 'turndown';

export class MarkdownParser {
  public static parser: Turndown = new Turndown();

  public static parse(html: string): string {
    if (!html) return '';
    return MarkdownParser.parser.turndown(html);
  }
}
