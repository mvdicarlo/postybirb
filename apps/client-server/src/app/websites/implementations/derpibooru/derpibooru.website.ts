import FileSize from '../../../utils/filesize.util';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { PhilomenaWebsite } from '../philomena/philomena.website';
import { DerpibooruFileSubmission } from './models/derpibooru-file-submission';

@WebsiteMetadata({
  name: 'derpibooru',
  displayName: 'Derpibooru',
})
@UserLoginFlow('https://derpibooru.org/sessions/new')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/gif',
    'video/webm',
  ],
  acceptedFileSizes: {
    maxBytes: FileSize.megabytes(100),
  },
  fileBatchSize: 1,
  acceptsExternalSourceUrls: true,
})
@SupportsUsernameShortcut({
  id: 'derpibooru',
  url: 'https://derpibooru.org/profiles/$1',
})
export default class Derpibooru extends PhilomenaWebsite<DerpibooruFileSubmission> {
  protected BASE_URL = 'https://derpibooru.org';

  createFileModel(): DerpibooruFileSubmission {
    return new DerpibooruFileSubmission();
  }
}
