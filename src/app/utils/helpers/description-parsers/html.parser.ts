export class CustomHTMLParser {
  public static parse(html: string): string {
    if (!html) return '';
    const blocks = ['p', 'div', 'pre'];
    blocks.forEach(block => {
      const regex = new RegExp(`<${block}(.*?)>((.|\n)*?)<\/${block}>`, 'gmi');
      html = html.replace(regex, '$2<br>');
    });

    return html;
  }
}

export class HTMLFormatParser {
  public static parse(html: string): string {
    if (!html) return '';
    html = HTMLFormatParser.preparse(html);
    html = HTMLFormatParser.trim(html)
    html = sanitize(html, {
      allowedTags: false,
      allowedAttributes: {
        'a': ['href', 'target'],
        'div': ['align', 'style'],
        'pre': ['align', 'style'],
        'p': ['align', 'style'],
        'h1': ['align', 'style'],
        'h2': ['align', 'style'],
        'h3': ['align', 'style'],
        'h4': ['align', 'style'],
        'h5': ['align', 'style'],
        'h6': ['align', 'style'],
        'span': ['align', 'style'],
      },
      allowedStyles: {
        '*': {
          'color': [/.*/],
          'text-align': [/.*/],
          'font-size': [/.*/]
        }
      }
    });
    html = HTMLFormatParser.bundle(html);
    html = html
      .replace(/<br \/>/g, '<br>')
      .replace(/<br\/>/g, '<br>');
    html = html.replace(/(\s)*&nbsp;/g, '');
    return html.trim();
  }

  private static preparse(html: string): string {
    if (!html) return '';

    html = html
      .replace(/<p/g, '<div')
      .replace(/<\/p/g, '</div');
    html = html.replace(/<div>(\s|\n|\r)*?<\/div>/g, '<br>');

    return html;
  }

  private static trim(html: string): string {
    if (!html) return '';

    const startRegex = /^(<br>|<br \/>)(\n|\r)*/gi
    let matches;
    while ((matches = html.match(startRegex))) {
      html = html.replace(startRegex, '');
    }

    const endRegex = /(<br>|<br \/>)(\n|\r)*$/gi
    while ((matches = html.match(endRegex))) {
      html = html.replace(endRegex, '');
    }

    return html.trim();
  }

  private static bundle(html: string): string {
    if (!html) return '';

    const nodeTree = [];
    const parsed = parse5.parseFragment(html);
    const { childNodes } = parsed;

    let lastNode = null;
    childNodes.filter(node => !node.value || node.value !== '\n').forEach(node => {
      if (lastNode && lastNode.tagName === 'a' && node.tagName === 'a') {
        lastNode = node;
        nodeTree.push({
          nodeName: '#text',
          value: '\n'
        });
        nodeTree.push(node);
        return;
      }

      if (lastNode) {
        if (node.tagName !== 'br' && lastNode.tagName === node.tagName && JSON.stringify(lastNode.attrs) === JSON.stringify(node.attrs)) {
          lastNode.childNodes.push({
            nodeName: 'br',
            tagName: 'br',
            attrs: [],
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            childNodes: []
          });

          lastNode.childNodes.push(...node.childNodes);
        } else {
          if (node.nodeName !== '#text' && lastNode.nodeName !== '#text') {
            nodeTree.push({
              nodeName: '#text',
              value: '\n'
            });
          }

          nodeTree.push(node);
          lastNode = node;
        }
      } else {
        nodeTree.push(node);
        lastNode = node;
      }
    });

    parsed.childNodes = nodeTree;
    return parse5.serialize(parsed, { encodeHtmlEntities: false });
  }
}
