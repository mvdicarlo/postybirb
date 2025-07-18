import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { BrowserWindowUtils } from '@postybirb/utils/electron';
import { parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { PillowfortAccountData } from './models/pillowfort-account-data';
import { PillowfortFileSubmission } from './models/pillowfort-file-submission';
import { PillowfortMessageSubmission } from './models/pillowfort-message-submission';

@WebsiteMetadata({
  name: 'pillowfort',
  displayName: 'PillowFort',
})
@UserLoginFlow('https://www.pillowfort.social/users/sign_in')
@SupportsUsernameShortcut({
  id: 'pillowfort',
  url: 'https://www.pillowfort.social/$1',
})
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    '*': FileSize.megabytes(2),
  },
})
export default class Pillowfort
  extends Website<PillowfortAccountData>
  implements
    FileWebsite<PillowfortFileSubmission>,
    MessageWebsite<PillowfortMessageSubmission>
{
  protected BASE_URL = 'https://www.pillowfort.social';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PillowfortAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(this.BASE_URL, {
        partition: this.accountId,
      });

      await BrowserWindowUtils.getLocalStorage(this.accountId, this.BASE_URL);

      if (res.body.includes('/signout')) {
        const html = parse(res.body);
        const username =
          html
            .querySelector('option[value="current_user"]')
            ?.innerText.trim() || 'Unknown';
        return this.loginState.setLogin(true, username);
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  createFileModel(): PillowfortFileSubmission {
    return new PillowfortFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    // PillowFort max file size is 2MB, we'll use default resizing logic
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<PillowfortFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    try {
      // Get form page and CSRF token
      const page = await Http.get<string>(`${this.BASE_URL}/posts/new`, {
        partition: this.accountId,
      });

      // Extract CSRF token
      const html = parse(page.body);
      const authToken = html
        .querySelector('input[name="authenticity_token"]')
        ?.getAttribute('value');

      if (!authToken) {
        return PostResponse.fromWebsite(this)
          .withMessage('Failed to extract CSRF token')
          .withAdditionalInfo({ authToken });
      }

      // Upload each image first
      const uploadedImages: Array<{ full_image: string; small_image: string }> =
        [];
      for (const file of files) {
        cancellationToken.throwIfCancelled();

        // Upload the image
        const upload = await Http.post<{
          full_image: string;
          small_image: string;
        }>(`${this.BASE_URL}/image_upload`, {
          partition: this.accountId,
          type: 'multipart',
          data: {
            file_name: file.fileName,
            photo: file.toPostFormat(),
          },
          headers: {
            'X-CSRF-Token': authToken,
          },
        });

        if (!upload.body?.full_image) {
          return PostResponse.fromWebsite(this)
            .withMessage('Failed to upload image')
            .withAdditionalInfo(upload.body);
        }

        uploadedImages.push(upload.body);
      }

      const builder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('authenticity_token', authToken)
        .setField('utf8', '✓')
        .setField('post_to', 'current_user')
        .setField('post_type', 'picture')
        .setField(
          'title',
          postData.options.useTitle ? postData.options.title : '',
        )
        .setField('content', `<p>${postData.options.description}</p>`)
        .setField('privacy', postData.options.privacy)
        .setField('tags', postData.options.tags.join(', '))
        .setField('commit', 'Submit')
        .setConditional('rebloggable', postData.options.allowReblogging, 'on')
        .setConditional('commentable', postData.options.allowComments, 'on')
        .setField(
          'picture[][pic_url]',
          uploadedImages.map((upload) => upload.full_image),
        )
        .setField(
          'picture[][small_image_url]',
          uploadedImages.map((upload) => upload.small_image),
        )
        .setField('picture[][b2_lg_url]', '')
        .setField('picture[][b2_sm_url]', '')
        .setField(
          'picture[][row]',
          uploadedImages.map((_, i) => `${i + 1}`),
        )
        .setField('picture[][col]', '0');

      // Submit the post
      const post = await builder.send<string>(`${this.BASE_URL}/posts/create`);

      if (post.statusCode === 200) {
        return PostResponse.fromWebsite(this);
      }

      return PostResponse.fromWebsite(this)
        .withMessage('Failed to post submission')
        .withAdditionalInfo(post.body);
    } catch (e) {
      this.logger.error('Failed to post submission', e);
      return PostResponse.fromWebsite(this)
        .withMessage(e.message)
        .withException(e);
    }
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): PillowfortMessageSubmission {
    return new PillowfortMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<PillowfortMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    try {
      // Get form page and CSRF token
      const page = await Http.get<string>(`${this.BASE_URL}/posts/new`, {
        partition: this.accountId,
      });

      // Extract CSRF token
      const html = parse(page.body);
      const authToken = html
        .querySelector('input[name="authenticity_token"]')
        ?.getAttribute('value');

      if (!authToken) {
        return PostResponse.fromWebsite(this)
          .withMessage('Failed to extract CSRF token')
          .withAdditionalInfo({ authToken });
      }

      const builder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('authenticity_token', authToken)
        .setField('utf8', '✓')
        .setField('post_to', 'current_user')
        .setField('post_type', 'text')
        .setField(
          'title',
          postData.options.useTitle ? postData.options.title : '',
        )
        .setField('content', `<p>${postData.options.description}</p>`)
        .setField('privacy', postData.options.privacy)
        .setField('tags', postData.options.tags.join(', '))
        .setField('commit', 'Submit')
        .setConditional('rebloggable', postData.options.allowReblogging, 'on')
        .setConditional('commentable', postData.options.allowComments, 'on')
        .setConditional(
          'nsfw',
          postData.options.rating !== SubmissionRating.GENERAL,
          'on',
        );

      // Submit the post
      const post = await builder.send<string>(`${this.BASE_URL}/posts/create`);

      if (post.statusCode === 200) {
        return PostResponse.fromWebsite(this);
      }

      return PostResponse.fromWebsite(this)
        .withMessage('Failed to post submission')
        .withAdditionalInfo(post.body);
    } catch (e) {
      this.logger.error('Failed to post submission', e);
      return PostResponse.fromWebsite(this)
        .withMessage(e.message)
        .withException(e);
    }
  }

  onValidateMessageSubmission = validatorPassthru;
}
