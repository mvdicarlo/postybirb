import { FileType } from '@postybirb/types';
import FileSize from '../../../utils/filesize.util';
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
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(16),
    [FileType.AUDIO]: FileSize.megabytes(100),
    [FileType.VIDEO]: FileSize.megabytes(200),
  },
  fileBatchSize: 4,
})
export default class Pixelfed extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'pixelfed' {
    return 'pixelfed';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 500;
  }
}
