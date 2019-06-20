import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { PlaintextParser } from './plaintext.parser';
import { BBCodeParser } from './bbcode.parser';
import { MarkdownParser } from './markdown.parser';

export class AdInsertParser {
  public static parse(html: string, postToWebsite: string): string {
    const appendNewLines: boolean = html.trim().length > 0;
    if (settingsDB.get('advertise').value()) {
      const registryEntry = WebsiteRegistry.getConfigForRegistry(postToWebsite);
      if (registryEntry && !registryEntry.websiteConfig.parsers.disableAdvertise) {

        // Don't want link conversion for plaintext only
        const parsers: any = registryEntry.websiteConfig.parsers.description;
        if (parsers.includes(PlaintextParser.parse)) {
          html += `${appendNewLines ? '\n\n' : ''}Posted using PostyBirb`;
        } else if (parsers.includes(BBCodeParser.parse)) {
          html += `${appendNewLines ? '\n\n' : ''}[url=http://www.postybirb.com]Posted using PostyBirb[/url]`;
        } else if (parsers.includes(MarkdownParser.parse)) {
          html += MarkdownParser.parse(`${appendNewLines ? '<br /><br />' : ''}<p><a href="http://www.postybirb.com">Posted using PostyBirb</a></p>`);
        } else { // assume html
          html += `${appendNewLines ? '<br /><br />' : ''}<p><a href="http://www.postybirb.com">Posted using PostyBirb</a></p>`;
        }
      }
    }

    return html;
  }
}
