import { FileType } from '@postybirb/types';
import FileSize from '../../../utils/filesize.util';
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
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(16),
    [FileType.AUDIO]: FileSize.megabytes(100),
    [FileType.VIDEO]: FileSize.megabytes(200),
  },
  fileBatchSize: 4,
})
@DisableAds()
export default class Pleroma extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'pleroma' {
    return 'pleroma';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 5000;
  }
}
