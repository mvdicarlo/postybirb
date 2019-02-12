export class BBCodeParser {
  public static parse(html: string): string {
    if (!html) return '';

    // html = html.replace(/<h[1-7](.*?)>(.*?)<\/h[1-7]>/, '\n[h]$2[/h]\n');
    html = html.replace(/<h[1-7](.*?)>(.*?)<\/h[1-7]>/, '$2\n');

    html = html.replace(/<br(.*?)>/gi, '\n');
    html = html.replace(/<hr(.*?)>/gi, '\n[hr]\n');

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

    html = html.replace(/<p(.*?)style="text-align: center;"(.*?)>(.*?)<\/p>/gi, '\n[center]$3[/center]\n');
    html = html.replace(/<p(.*?)style="text-align: left;"(.*?)>(.*?)<\/p>/gi, '\n[left]$3[/left]\n');
    html = html.replace(/<p(.*?)style="text-align: right;"(.*?)>(.*?)<\/p>/gi, '\n[right]$3[/right]\n');
    html = html.replace(/<span style="color: (.*?);">(.*?)<\/span>/gmi, '[color=$1]$2[/color]');

    html = html.replace(/<li(.*?)>(.*?)<\/li>/gi, '[*]$2');
    html = html.replace(/<ul(.*?)>/gi, '[list]');
    html = html.replace(/<\/ul>/gi, '[/list]');
    html = html.replace(/<div>/gi, '');
    html = html.replace(/<\/div>/gi, '\n');
    html = html.replace(/<p>/gi, '');
    html = html.replace(/<\/p>/gi, '\n');
    html = html.replace(/<pre>/gi, '');
    html = html.replace(/<\/pre>/gi, '\n');
    html = html.replace(/<td(.*?)>/gi, ' ');
    html = html.replace(/<tr(.*?)>/gi, '\n');
    html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '[url=$2]$4[/url]');

    html = html.replace(/<head>(.*?)<\/head>/gmi, '');
    html = html.replace(/<object>(.*?)<\/object>/gmi, '');
    html = html.replace(/<script(.*?)>(.*?)<\/script>/gmi, '');
    html = html.replace(/<style(.*?)>(.*?)<\/style>/gmi, '');
    html = html.replace(/<title>(.*?)<\/title>/gmi, '');
    html = html.replace(/<!--(.*?)-->/gmi, '\n');

    html = html.replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gmi, '');
    html = html.replace(/\r\r/gi, '');
    html = html.replace(/(\S)\n/gi, '$1 ');
    html = html.replace(/&nbsp;/gi, '');

    return html.trim();
  }
}
