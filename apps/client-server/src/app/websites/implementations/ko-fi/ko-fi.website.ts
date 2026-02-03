import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse,
} from '@postybirb/types';
import { BrowserWindowUtils } from '@postybirb/utils/electron';
import { parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { BaseWebsiteOptions } from '../../models/base-website-options';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { KoFiAccountData } from './models/ko-fi-account-data';
import { KoFiFileSubmission } from './models/ko-fi-file-submission';
import { KoFiMessageSubmission } from './models/ko-fi-message-submission';

type KoFiSessionData = {
  kofiAccountId?: string;
  pageId?: string;
};

@WebsiteMetadata({
  name: 'ko-fi',
  displayName: 'Ko-fi',
})
@UserLoginFlow('https://ko-fi.com/account/login')
@SupportsFiles({
  fileBatchSize: 10,
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
})
export default class KoFi
  extends Website<KoFiAccountData, KoFiSessionData>
  implements
    FileWebsite<KoFiFileSubmission>,
    MessageWebsite<KoFiMessageSubmission>
{
  protected BASE_URL = 'https://ko-fi.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<KoFiAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      // Retrieve settings page to check login status
      const res = await Http.get<string>(`${this.BASE_URL}/settings`, {
        partition: this.accountId,
      });

      // Check if logged in by looking for login button
      if (!res.body.includes('btn-login')) {
        const html = parse(res.body);
        const username = html
          .querySelector('input[name="DisplayName"]')
          ?.getAttribute('value');
        // Extract user ID and username
        const kofiAccountId = html
          .querySelector('input[id="handle"]')
          ?.getAttribute('value');
        this.sessionData.kofiAccountId = kofiAccountId;
        this.sessionData.pageId = this.extractId(res.body);

        if (kofiAccountId) {
          await this.retrieveAlbums(kofiAccountId);
        } else {
          this.logger.error('Failed to retrieve Ko-fi account Id');
        }

        return this.loginState.setLogin(true, username || 'Unknown');
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  private extractId(html: string): string | null {
    const match = html.match(/pageId:\s*'([^']+)'/);
    return match ? match[1] : null;
  }

  private async retrieveAlbums(id: string): Promise<void> {
    try {
      const { body } = await Http.get<string>(
        `${this.BASE_URL}/${id}/gallery`,
        {
          partition: this.accountId,
        },
      );

      const albums: SelectOption[] = [];

      // Extract albums from gallery page
      const html = parse(body);
      const albumElements = html.querySelectorAll(
        '.hz-album-each a[href^="/album/"]',
      );

      for (const match of albumElements) {
        const label = match.innerText.trim();
        const albumId = match.getAttribute('href')?.replace('/album/', '');
        albums.push({
          label,
          value: albumId,
        });
      }

      await this.websiteDataStore.setData({ folders: albums });
    } catch (error) {
      this.logger.error('Failed to retrieve albums', error);
    }
  }

  createMessageModel(): BaseWebsiteOptions {
    return new KoFiMessageSubmission();
  }

  createFileModel(): KoFiFileSubmission {
    return new KoFiFileSubmission();
  }

  async onPostFileSubmission(
    postData: PostData<KoFiFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    // Upload each file and collect image upload IDs
    const imageUploadIds = [];

    for (const file of files) {
      // Upload the file
      const uploadBuilder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .addFile('file[0]', file)
        .setField('filenames', file.fileName);

      const upload = await uploadBuilder.send<{ ExternalId: string }[]>(
        `${this.BASE_URL}/api/media/gallery-item/upload?throwOnError=true`,
      );

      if (typeof upload.body !== 'string') {
        imageUploadIds.push(upload.body[0].ExternalId);
      } else {
        return PostResponse.fromWebsite(this)
          .withException(new Error('Failed to parse upload response'))
          .withAdditionalInfo(upload.body);
      }
    }

    // Create the gallery post
    const postBuilder = new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('Album', postData.options.album || '')
      .setField('Audience', postData.options.audience)
      .setField('Description', postData.options.description)
      .setField('DisableNewComments', false)
      .setField('EnableHiRes', postData.options.hiRes)
      .setField('GalleryItemId', '')
      .setField('ImageUploadIds', imageUploadIds)
      .setField('PostToTwitter', false)
      .setField('ScheduleEnabled', false)
      .setField('ScheduledDate', '')
      .setField('ScheduledTime', '')
      .setField('Title', postData.options.title)
      .setField('UploadAsIndividualImages', false)
      .withHeaders({
        Accept: 'text/html, */*',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Referer: 'https://ko-fi.com/',
        Connection: 'keep-alive',
      });

    const post = await postBuilder.send<{ success: boolean }>(
      `${this.BASE_URL}/Gallery/AddGalleryItem`,
    );

    // Check for success in response
    const success =
      typeof post.body === 'string'
        ? (post.body as string).includes(JSON.stringify({ success: true }))
        : post.body.success;

    if (success) {
      let sourceUrl: string | undefined;
      try {
        // Try to find the source url
        sourceUrl = await BrowserWindowUtils.runScriptOnPage(
          this.accountId,
          `${this.BASE_URL}/${this.sessionData.kofiAccountId}/posts`,
          `return document.querySelector('#postsContainerDiv .feeditem-unit .dropdown-share-list input').value`,
          500,
        );
      } catch (e) {
        this.logger.warn(
          'Failed to retrieve post page for source url fetch',
          e,
        );
      }
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(post.body)
        .withSourceUrl(sourceUrl);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Post failed'))
      .withAdditionalInfo(post.body);
  }

  onValidateFileSubmission = validatorPassthru;

  async onPostMessageSubmission(
    postData: PostData<KoFiMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('type', 'Article')
      .setField('blogPostId', '0')
      .setField('scheduledDate', undefined)
      .setField('scheduled', undefined)
      .setField('scheduledOffset', undefined)
      .setField('attachmentIds', undefined)
      .setField('blogPostTitle', postData.options.title)
      .setField('postBody', postData.options.description)
      .setField('featuredImage', undefined)
      .setField('noFeaturedImage', false)
      .setField('FeaturedImageAltText', undefined)
      .setField('embedUrl', undefined)
      .setField('tags', postData.options.tags.join(','))
      .setField('postAudience', postData.options.audience)
      .setField('submit', 'publish')
      .withHeaders({
        Accept: 'text/html, */*',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Referer: 'https://ko-fi.com/',
        Connection: 'keep-alive',
      });

    const post = await builder.send<string>(
      `${this.BASE_URL}/Blog/AddBlogPost`,
    );

    if (typeof post.body === 'object') {
      const errBody = post.body as {
        error: string;
        friendly_error_message: string;
        success: boolean;
      };
      if (errBody.success === false) {
        return PostResponse.fromWebsite(this)
          .withException(
            new Error(errBody.friendly_error_message || errBody.error),
          )
          .withAdditionalInfo(errBody);
      }
    }

    PostResponse.validateBody(this, post);
    return PostResponse.fromWebsite(this)
      .withSourceUrl(post.responseUrl)
      .withAdditionalInfo(post.body);
  }

  onValidateMessageSubmission = validatorPassthru;
}
