import Turndown from 'turndown';

export class MarkdownParser {
  private static parser: Turndown = new Turndown();

  public static parse(html: string): string {
    if (!html) return '';
    return this.parser.turndown(html);
  }
}
