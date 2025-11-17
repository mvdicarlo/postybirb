import FileSize from '../../../utils/filesize.util';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { PhilomenaWebsite } from '../philomena/philomena.website';
import { ManebooruFileSubmission } from './models/manebooru-file-submission';

@WebsiteMetadata({
  name: 'manebooru',
  displayName: 'Manebooru',
})
@UserLoginFlow('https://manebooru.art/sessions/new')
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
  id: 'manebooru',
  url: 'https://manebooru.art/profiles/$1',
})
export default class Manebooru extends PhilomenaWebsite<ManebooruFileSubmission> {
  protected BASE_URL = 'https://manebooru.art';

  createFileModel(): ManebooruFileSubmission {
    return new ManebooruFileSubmission();
  }
}
