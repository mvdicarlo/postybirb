export class CustomHTMLParser {
  public static parse(html: string): string {
    if (!html) return '';
    html = html.replace(/>\s</g, '><');
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
    return null;
  }

  //   const parse5 = require('parse5');
  // const sanitize = require('sanitize-html');
  //
  // const str = `
  // <div>
  // </div>
  // <div id="Hello">First Line</div>
  // <p> </p>
  // Basic Text
  // BasicText 2
  // <hr>
  // <div style="text-align: center; margin-left: 10px"><span>Hello!</span></div>
  // <div style="text-align: center; margin-left: 10px">Goodbye!</div>
  // <div style="text-align: right; margin-left: 10px">Right!</div>
  // <div>Hello</div>
  // <div><b>Collapsed</b></div>
  // <a href="google.com">Text</a>
  // <a href="google.com">2</a>
  // <div></div>
  // `.trim();
  //
  // const preparsed = preparse(str);
  // const trimmed = trim(preparsed);
  // const sanitized = sanitize(trimmed, {
  //     allowedTags: false,
  //     allowedAttributes: {
  //         '*': ['align', 'style', 'href', 'target']
  //     },
  //     allowedStyles: {
  //         '*': {
  //             'color': [/.*/],
  //             'text-align': [/.*/],
  //             'font-size': [/.*/]
  //         }
  //     }
  // });
  //
  // const parsed = bundle(sanitized);

  private static preparse(html): string {
    if (!html) return '';

    html = html
      .replace(/<p/g, '<div')
      .replace(/<\/p/, '</div');
    html = html.replace(/<div>(\s|\n|\r)*?<\/div>/g, '<br>');

    return html;
  }

  private static trim(html: string): string {
    if (!html) return '';

    const startRegex = /^(<br>|<br \/>)(\n|\r)*/gi
    let matches
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
        if (lastNode.tagName === node.tagName && JSON.stringify(lastNode.attrs) === JSON.stringify(node.attrs)) {
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
    return parse5.serialize(parsed);
  }
}
