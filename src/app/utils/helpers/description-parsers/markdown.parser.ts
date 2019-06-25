import Turndown from 'turndown';

export class MarkdownParser {
  public static parser: Turndown = new Turndown();

  // NOTE: Still causes extra new line between alignments
  public static parse(html: string): string {
    if (!html) return '';
    html = html.replace(/<\/div>\n<br>/g, '</div>\n');
    return MarkdownParser.parser.turndown(html);
  }
}
