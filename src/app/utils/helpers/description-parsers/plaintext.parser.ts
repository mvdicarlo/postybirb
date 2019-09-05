export class PlaintextParser {
  public static parse(html: string): string {
    if (!html) return '';

    html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '$4 ( $2 )');
    html = html.replace(/<h[1-7](.*?)>(.*?)<\/h[1-7]>/, '$2\n');

    html = html.replace(/<br>\n/gi, '<br>');
    html = html.replace(/<br>/gi, '\n');
    html = html.replace(/<hr(.*?)>/gi, '\n------------\n');

    html = html.replace(/<div>/gi, '');
    html = html.replace(/<\/div>/gi, '');
    html = html.replace(/<p>/gi, '');
    html = html.replace(/<\/p>/gi, '');
    html = html.replace(/<pre>/gi, '');
    html = html.replace(/<\/pre>/gi, '');
    html = html.replace(/<td(.*?)>/gi, ' ');
    html = html.replace(/<tr(.*?)>/gi, '\n');

    html = html.replace(/<head>(.*?)<\/head>/gmi, '');
    html = html.replace(/<object>(.*?)<\/object>/gmi, '');
    html = html.replace(/<script(.*?)>(.*?)<\/script>/gmi, '');
    html = html.replace(/<style(.*?)>(.*?)<\/style>/gmi, '');
    html = html.replace(/<title>(.*?)<\/title>/gmi, '');
    html = html.replace(/<!--(.*?)-->/gmi, '\n');

    html = html.replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gmi, '');
    html = html.replace(/\r\r/gi, '');
    // html = html.replace(/(\S)\n/gi, '$1 ');
    html = entities.decode(html);
    html = html.replace(/&nbsp;/gi, '');
    html = html.replace(/&gt;/gi, '>');
    html = html.replace(/&lt;/gi, '<');
    html = html.replace(/&amp;/gi, '&');

    const duplicateCheck = html.match(/(\S*?) \(\s(.*?)\s\)/g) || [];
    duplicateCheck.forEach(potentialDuplicate => {
      const parts = potentialDuplicate.split(' ');
      const part1 = parts[0];
      const part2 = parts[2].replace(/(\(|\))/g, '');
      if (part1 === part2) {
        html = html.replace(potentialDuplicate, part1);
      }
    });

    return html.trim();
  }
}
