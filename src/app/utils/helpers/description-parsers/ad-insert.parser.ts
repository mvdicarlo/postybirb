import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { PlaintextParser } from './plaintext.parser';

export class AdInsertParser {
  public static parse(html: string, postToWebsite: string): string {
    if (settingsDB.get('advertise').value()) {
      const registryEntry = WebsiteRegistry.getConfigForRegistry(postToWebsite);
      if (registryEntry && !registryEntry.websiteConfig.parsers.disableAdvertise) {

        // Don't want link conversion for plaintext only
        if (registryEntry.websiteConfig.parsers.description.includes(PlaintextParser.parse)) {
          html += '\n\nPosted using PostyBirb';
        } else {
          html += '<br /><br /><p><a href="http://www.postybirb.com">Posted using PostyBirb</a></p>';
        }
      }
    }

    return html;
  }
}
