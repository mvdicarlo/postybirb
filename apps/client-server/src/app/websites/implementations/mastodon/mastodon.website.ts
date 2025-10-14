import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { MegalodonWebsite } from '../megalodon/megalodon.website';

@WebsiteMetadata({
  name: 'mastodon',
  displayName: 'Mastodon',
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
  acceptedFileSizes: { '*': 40_000_000 }, // 40MB default
  fileBatchSize: 4,
})
export default class Mastodon extends MegalodonWebsite {
  protected getMegalodonInstanceType(): 'mastodon' {
    return 'mastodon';
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 500; // Mastodon default fallback
  }
}
