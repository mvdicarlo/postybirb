import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { PlaintextParser } from './plaintext.parser';
import { BBCodeParser } from './bbcode.parser';

export class AdInsertParser {
  public static parse(html: string, postToWebsite: string): string {
    if (settingsDB.get('advertise').value()) {
      const registryEntry = WebsiteRegistry.getConfigForRegistry(postToWebsite);
      if (registryEntry && !registryEntry.websiteConfig.parsers.disableAdvertise) {

        // Don't want link conversion for plaintext only
        const parsers: any = registryEntry.websiteConfig.parsers.description;
        if (parsers.includes(PlaintextParser.parse)) {
          html += '\n\nPosted using PostyBirb';
        } else if (parsers.includes(BBCodeParser.parse)) {
          html += '\n\n[url=http://www.postybirb.com]Posted using PostyBirb[/url]';
        } else { // assume html
          html += '<br /><br /><p><a href="http://www.postybirb.com">Posted using PostyBirb</a></p>';
        }
      }
    }

    return html;
  }
}
