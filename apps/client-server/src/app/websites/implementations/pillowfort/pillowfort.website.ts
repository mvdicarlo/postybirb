import { BrowserWindowUtils } from '@postybirb/browser-window-utils';
import { Http } from '@postybirb/http';
import {
  FileSize,
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
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
@UserLoginFlow('https://www.pillowfort.social')
@SupportsUsernameShortcut({
  id: 'pf',
  url: 'https://www.pillowfort.social/$1',
})
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.mbToBytes(10),
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
        const username = html.querySelector('title')?.innerText.split(' | ')?.[1] || null;
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
    // PillowFort max file size is 10MB, we'll use default resizing logic
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
      const csrfToken = html
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      if (!csrfToken) {
        return PostResponse.fromWebsite(this)
          .withMessage('Failed to extract CSRF token')
          .withExceptionType('WEBSITE_ERROR');
      }

      // Upload each image first
      const uploadedImages = [];
      for (const file of files) {
        if (cancellationToken.isCancelled()) {
          return PostResponse.fromWebsite(this)
            .withMessage('Post was cancelled')
            .withExceptionType('CANCELLED');
        }

        // Upload the image
        const upload = await Http.post<{
          full_image: string;
          small_image: string;
        }>(`${this.BASE_URL}/image_upload`, {
          partition: this.accountId,
          type: 'multipart',
          data: {
            file_name: file.options.filename,
            photo: file,
          },
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        });

        if (!upload.body?.full_image) {
          return PostResponse.fromWebsite(this)
            .withMessage('Failed to upload image')
            .withExceptionType('WEBSITE_ERROR');
        }

        uploadedImages.push(upload.body);
      }

      // Prepare form data
      const form: Record<string, any> = {
        authenticity_token: csrfToken,
        utf8: '✓',
        post_to: 'current_user',
        post_type: 'picture',
        title: postData.options.useTitle ? postData.options.title : '',
        content: postData.options.description.toString(),
        privacy: postData.options.privacy,
        tags: (postData.options.tags?.value || []).join(', '),
        commit: 'Submit',
      };

      if (postData.options.allowReblogging) {
        form.rebloggable = 'on';
      }

      if (postData.options.allowComments) {
        form.commentable = 'on';
      }

      // FormData for the final POST
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Add the uploaded images to the form
      uploadedImages.forEach((upload, i) => {
        formData.append('picture[][pic_url]', upload.full_image);
        formData.append('picture[][small_image_url]', upload.small_image);
        formData.append('picture[][b2_lg_url]', '');
        formData.append('picture[][b2_sm_url]', '');
        formData.append('picture[][row]', `${i + 1}`);
        formData.append('picture[][col]', '0');
      });

      // Submit the post
      const post = await Http.post<string>(`${this.BASE_URL}/posts/create`, {
        partition: this.accountId,
        type: 'multipart',
        data: formData,
      });

      if (post.statusCode === 200) {
        return PostResponse.fromWebsite(this);
      }

      return PostResponse.fromWebsite(this)
        .withMessage('Failed to post submission')
        .withExceptionType('WEBSITE_ERROR')
        .withAdditionalInfo(post.body);
    } catch (e) {
      this.logger.error('Failed to post submission', e);
      return PostResponse.fromWebsite(this)
        .withMessage(e.message)
        .withException(e);
    }
  }

  async onValidateFileSubmission(
    postData: PostData<PillowfortFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Title is required
    if (!postData.options.title) {
      errors.push('Title is required');
    }

    return { warnings, errors };
  }

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
      const csrfToken = html
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      if (!csrfToken) {
        return PostResponse.fromWebsite(this)
          .withMessage('Failed to extract CSRF token')
          .withExceptionType('WEBSITE_ERROR');
      }

      // Prepare form data
      const form = {
        authenticity_token: csrfToken,
        utf8: '✓',
        post_to: 'current_user',
        post_type: 'text',
        title: postData.options.useTitle ? postData.options.title : '',
        content: postData.options.description.toString(),
        privacy: postData.options.privacy,
        tags: (postData.options.tags?.value || []).join(', '),
        commit: 'Submit',
      };

      if (postData.options.allowReblogging) {
        form['rebloggable'] = 'on';
      }

      if (postData.options.allowComments) {
        form['commentable'] = 'on';
      }

      if (postData.options.rating !== 'general') {
        form['nsfw'] = 'on';
      }

      // Submit the post
      const post = await Http.post<string>(`${this.BASE_URL}/posts/create`, {
        partition: this.accountId,
        type: 'multipart',
        data: form,
      });

      if (post.statusCode === 200) {
        return PostResponse.fromWebsite(this);
      }

      return PostResponse.fromWebsite(this)
        .withMessage('Failed to post submission')
        .withExceptionType('WEBSITE_ERROR')
        .withAdditionalInfo(post.body);
    } catch (e) {
      this.logger.error('Failed to post submission', e);
      return PostResponse.fromWebsite(this)
        .withMessage(e.message)
        .withException(e);
    }
  }

  async onValidateMessageSubmission(
    postData: PostData<PillowfortMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Title is required
    if (!postData.options.title) {
      errors.push('Title is required');
    }

    return { warnings, errors };
  }
}