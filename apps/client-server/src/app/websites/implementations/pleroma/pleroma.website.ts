import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { MegalodonWebsite } from '../megalodon/megalodon.website';

@WebsiteMetadata({
  name: 'pleroma',
  displayName: 'Pleroma',
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
    'application/msword',
    'application/rtf',
    'text/plain',
    'audio/mpeg',
  ],
  acceptedFileSizes: { '*': 16_000_000 }, // 16MB typical
  fileBatchSize: 4,
})
export default class Pleroma extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'pleroma' {
    return 'pleroma';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 5000; // Pleroma typically allows more
  }
}
