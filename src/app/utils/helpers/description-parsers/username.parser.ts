export class UsernameParser {
  /**
   * Converts username shortcuts such as :falemonynade: -> href="https://www.furaffinity.net/user/lemonynade
   * @param  html        Text to be parsed
   * @param  code        Website code e.g. fa
   * @param  replacement Regex replacement string e.g. https://www.furaffinity.net/user/$1
   */
  public static parse(html: string, code: string, replacement: string): string {
    if (!html) return '';

    const regex = new RegExp(`:${code}(.+?):`, 'gi');
    html = html.replace(regex, (match, first) => {
      if (!first) return match;
      const trimmedMatch = first.replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gi, '').trim();
      if (!trimmedMatch.length) return match;
      return `<a href="${replacement.replace('$1', trimmedMatch)}">${trimmedMatch}</a>`;
    });

    return html;
  }

  /**
   * Converts username shortcuts such as :falemonynade: -> :iconlemonynade:
   * @param  html        Text to be parsed
   * @param  code        Website code e.g. fa
   * @param  replacement Regex replacement string
   */
  public static replaceText(html: string, code: string, replacement: string, parseFn?: (s) => string): string {
    if (!html) return '';

    const regex = new RegExp(`:${code}(.+?):`, 'gi');
    html = html.replace(regex, (match, first) => {
      if (!first) return match;
      let trimmedMatch = first.replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gi, '').trim();
      if (!trimmedMatch.length) return match;
      if (parseFn) {
        trimmedMatch = parseFn(trimmedMatch);
      }
      return replacement.replace(/\$1/g, trimmedMatch);
    });

    return html;
  }
}
