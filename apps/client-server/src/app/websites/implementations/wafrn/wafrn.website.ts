import { FileType } from '@postybirb/types';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { FediverseInstanceTypes } from '../megalodon/megalodon-api-service';
import { MegalodonWebsite } from '../megalodon/megalodon.website';

/**
 * Wafrn (https://wafrn.net) through its Mastodon compatible API.
 *
 * - Megalodon's detector does not know Wafrn, so the Mastodon client is used
 *   without detection.
 * - Wafrn renders the status text as Markdown: a line starting with `#tag`
 *   would become a heading and the tag would be lost, so the `#` is escaped.
 * - Wafrn ignores `sensitive`, a post is only marked as NSFW by its content
 *   warning, so sensitive posts get one when none is set.
 */
@WebsiteMetadata({
  name: 'wafrn',
  displayName: 'Wafrn',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(250),
    [FileType.AUDIO]: FileSize.megabytes(250),
    [FileType.VIDEO]: FileSize.megabytes(250),
  },
  fileBatchSize: 10,
})
@DisableAds()
export default class Wafrn extends MegalodonWebsite {
  static readonly DEFAULT_CONTENT_WARNING = 'NSFW';

  protected getMegalodonInstanceType(): 'mastodon' {
    return 'mastodon';
  }

  protected async getInstanceType(): Promise<FediverseInstanceTypes> {
    return this.getMegalodonInstanceType();
  }

  protected getDefaultMaxDescriptionLength(): number {
    return 500;
  }

  protected formatStatusText(text: string): string {
    return text.replace(/^([ \t]*)#(?=[^\s#])/gm, '$1\\#');
  }

  protected getSpoilerText(
    spoilerText: string | undefined,
    isSensitiveRating: boolean,
  ): string | undefined {
    if (spoilerText?.trim()) return spoilerText;
    return isSensitiveRating ? Wafrn.DEFAULT_CONTENT_WARNING : undefined;
  }
}
