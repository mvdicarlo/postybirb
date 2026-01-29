import { PostData, PostResponse } from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { PhilomenaWebsite } from '../philomena/philomena.website';
import { FurbooruFileSubmission } from './models/furbooru-file-submission';

@WebsiteMetadata({ name: 'furbooru', displayName: 'Furbooru' })
@UserLoginFlow('https://furbooru.org/session/new')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/gif',
    'video/webm',
  ],
  acceptedFileSizes: { '*': FileSize.megabytes(100) },
})
@DisableAds()
@SupportsUsernameShortcut({
  id: 'furbooru',
  url: 'https://furbooru.org/profiles/$1',
})
export default class Furbooru extends PhilomenaWebsite<FurbooruFileSubmission> {
  protected BASE_URL = 'https://furbooru.org';

  createFileModel(): FurbooruFileSubmission {
    return new FurbooruFileSubmission();
  }

  async onPostFileSubmission(
    postData: PostData<FurbooruFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    try {
      const result = await super.onPostFileSubmission(
        postData,
        files,
        batchIndex,
        cancellationToken,
      );
      return result;
    } catch (err) {
      // Users have reported it working on a second attempt
      this.logger?.warn(err, 'Furbooru Post Retry');
      const retry = await super.onPostFileSubmission(
        postData,
        files,
        batchIndex,
        cancellationToken,
      );
      return retry;
    }
  }
}
