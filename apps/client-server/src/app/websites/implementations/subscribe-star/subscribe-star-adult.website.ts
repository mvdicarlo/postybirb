import { FileType } from '@postybirb/types';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import BaseSubscribeStar from './base-subscribe-star.website';

@WebsiteMetadata({
  name: 'subscribe-star-adult',
  displayName: 'SubscribeStar (Adult)',
})
@UserLoginFlow('https://www.subscribestar.adult/login')
@SupportsUsernameShortcut({
  id: 'subscribe-star-adult',
  url: 'https://www.subscribestar.adult/$1',
})
@SupportsFiles({
  fileBatchSize: 20,
  acceptedMimeTypes: [
    'audio/aac',
    'audio/x-aac',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/x-pn-wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/3gpp',
    'video/x-flv',
    'video/avi',
    'video/ogg',
    'video/x-ms-wmv',
    'video/wmv',
    'video/x-matroska',
    'video/quicktime',
    'image/jpeg',
    'image/gif',
    'image/tiff',
    'image/png',
    'image/x-png',
    'image/webp',
    'application/octet-stream',
    'application/x-rar-compressed',
    'application/x-compressed',
    'application/x-rar',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
    'application/x-mobipocket-ebook',
    'application/epub+zip',
    'application/epub',
    'application/vnd.ms-fontobjec',
    'text/plain',
    'text/csv',
    'application/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/html',
    'image/vnd.adobe.photoshop',
    'application/x-photoshop',
    'application/photoshop',
    'application/psd',
    'image/psd',
    'application/json',
    'application/pdf',
    'application/vnd.oasis.opendocument.text',
    'text/rtf',
  ],
  acceptedFileSizes: {
    [FileType.AUDIO]: 52428800,
    [FileType.VIDEO]: 262144000,
    [FileType.IMAGE]: 8388608,
    [FileType.TEXT]: 314572800,
  },
})
@DisableAds()
export default class SubscribeStarAdult extends BaseSubscribeStar {
  protected BASE_URL = 'https://www.subscribestar.adult';
}
