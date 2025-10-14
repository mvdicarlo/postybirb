import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { MegalodonWebsite } from '../megalodon/megalodon.website';

@WebsiteMetadata({
  name: 'pixelfed',
  displayName: 'Pixelfed',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/x-shockwave-flash',
    'video/x-flv',
    'video/mp4',
  ],
  acceptedFileSizes: { '*': 15_000_000 },
  fileBatchSize: 10,
})
export default class Pixelfed extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'pixelfed' {
    return 'pixelfed';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 500; // Pixelfed uses Mastodon-like limits
  }
}
