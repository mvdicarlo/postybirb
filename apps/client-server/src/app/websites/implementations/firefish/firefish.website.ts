import { FileType } from '@postybirb/types';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { MegalodonWebsite } from '../megalodon/megalodon.website';

@WebsiteMetadata({
  name: 'firefish',
  displayName: 'Firefish',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/x-m4v',
    'video/quicktime',
    'application/msword',
    'application/rtf',
    'text/plain',
    'audio/mpeg', // mp3
    'audio/wav',
    'audio/ogg', // ogg, oga
    'audio/opus',
    'audio/aac',
    'audio/mp4',
    'video/3gpp',
    'audio/x-ms-wma',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(16),
    [FileType.AUDIO]: FileSize.megabytes(100),
    [FileType.VIDEO]: FileSize.megabytes(200),
  },
  fileBatchSize: 4,
})
@DisableAds()
export default class Firefish extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'firefish' {
    return 'firefish';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 500;
  }
}
