export class BBCodeParser {
  private static BLOCKS: string[] = ['p', 'div', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  public static parse(html: string): string {
    if (!html) return '';

    // html = html.replace(/<h[1-7](.*?)>(.*?)<\/h[1-7]>/, '\n[h]$2[/h]\n');

    html = html.replace(/<b>/gi, '[b]');
    html = html.replace(/<i>/gi, '[i]');
    html = html.replace(/<u>/gi, '[u]');
    html = html.replace(/<s>/gi, '[s]');
    html = html.replace(/<\/b>/gi, '[/b]');
    html = html.replace(/<\/i>/gi, '[/i]');
    html = html.replace(/<\/u>/gi, '[/u]');
    html = html.replace(/<\/s>/gi, '[/s]');
    html = html.replace(/<em>/gi, '[i]');
    html = html.replace(/<\/em>/gi, '[/i]');
    html = html.replace(/<strong>/gi, '[b]');
    html = html.replace(/<\/strong>/gi, '[/b]');

    BBCodeParser.BLOCKS.forEach(block => {
      const regex = new RegExp(`<${block}(.*?)style="text-align:((left|right|center)?)"(.*?)>((.|\n)*?)<\/${block}>`, 'gmi');
      html = html.replace(regex, '[$3]$5[/$3]');

      const regex2 = new RegExp(`<${block}>\\s<\/${block}>`, 'gm');
      html = html.replace(regex2, '<br>');
    });

    html = BBCodeParser.postParse(html);

    html = html.replace(/<span style="color:(.*?)">((.|\n)*?)<\/span>/gmi, '[color=$1]$2[/color]');

    html = html.replace(/<h[1-7](.*?)>(.*?)<\/h[1-7]>/, '$2\n');

    html = html.replace(/<br>/gi, '\n');
    html = html.replace(/<hr(.*?)>/gi, '\n[hr]\n');

    // opting to use \r for now
    html = html.replace(/<li(.*?)>(.*?)<\/li>/gi, '[*]$2');
    html = html.replace(/<ul(.*?)>/gi, '[list]');
    html = html.replace(/<\/ul>/gi, '[/list]');

    BBCodeParser.BLOCKS.forEach(block => {
      const regex1 = new RegExp(`</${block}>`, 'gmi');
      html = html.replace(regex1, '\n');

      const regex2 = new RegExp(`<${block}>`, 'gmi');
      html = html.replace(regex2, '');
    });

    html = html.replace(/<td(.*?)>/gi, ' ');
    html = html.replace(/<tr(.*?)>/gi, '\r');
    html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '[url=$2]$4[/url]');

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
    html = html.replace(/&gt;/gi, '>');
    html = html.replace(/&lt;/gi, '<');
    html = html.replace(/&amp;/gi, '&');

    return html.trim();
  }

  private static postParse(html: string): string {
    if (!html) return '';

    html = html.replace(/(\n|\r)/g, '');

    const tags: string[] = ['b','s','u','i'];
    tags.forEach(tag => {
      BBCodeParser.BLOCKS.forEach(block => {
        const regex = new RegExp(`\\[\/${tag}\\]<\/${block}><${block}>\\[${tag}\\]`, 'gmi');
        html = html.replace(regex, '\n');
      });
    });

    const blocks = ['left', 'right', 'center'];
    blocks.forEach(block => {
      const regex = new RegExp(`\\[\/${block}\\]\\[${block}\\]`, 'gmi');
      html = html.replace(regex, '\n');
    });

    return html;
  }
}
