import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
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
import { NewgroundsAccountData } from './models/newgrounds-account-data';
import { NewgroundsFileSubmission } from './models/newgrounds-file-submission';
import { NewgroundsMessageSubmission } from './models/newgrounds-message-submission';

type NewgroundsPostResponse = {
  edit_url: string;
  can_publish: boolean;
  project_id: number;
  success: string;
};

@WebsiteMetadata({
  name: 'newgrounds',
  displayName: 'Newgrounds',
})
@UserLoginFlow('https://www.newgrounds.com/login')
@SupportsUsernameShortcut({
  id: 'ng',
  url: 'https://$1.newgrounds.com',
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(40),
  },
})
export default class Newgrounds
  extends Website<NewgroundsAccountData>
  implements
    FileWebsite<NewgroundsFileSubmission>,
    MessageWebsite<NewgroundsMessageSubmission>
{
  protected BASE_URL = 'https://www.newgrounds.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<NewgroundsAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(this.BASE_URL, {
        partition: this.accountId,
      });

      if (res.body.includes('activeuser')) {
        const match = res.body.match(/"name":"(.*?)"/);
        const username = match ? match[1] : 'Unknown';
        return this.loginState.setLogin(true, username);
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  createFileModel(): NewgroundsFileSubmission {
    return new NewgroundsFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return { maxBytes: FileSize.megabytes(40) };
  }

  private parseDescription(text: string): string {
    return text.replace(/<div/gm, '<p').replace(/<\/div>/gm, '</p>');
  }

  private getSuitabilityRating(rating: SubmissionRating | string): string {
    switch (rating) {
      case SubmissionRating.GENERAL:
        return 'e';
      case SubmissionRating.MATURE:
        return 'm';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 'a';
      case 't':
        return 't';
      default:
        return 'e';
    }
  }

  private formatTags(tags: string[]): string[] {
    return tags
      .map((tag) =>
        tag
          .replace(/(\(|\)|:|#|;|\]|\[|')/g, '')
          .replace(/_/g, '-')
          .replace(/\s+/g, '-')
          .toLowerCase(),
      )
      .slice(0, 12);
  }

  private checkIsSaved(response: NewgroundsPostResponse): boolean {
    return response.success === 'saved';
  }

  private async cleanUpFailedProject(
    projectId: number,
    userKey: string,
  ): Promise<void> {
    try {
      await Http.post(`${this.BASE_URL}/projects/art/remove/${projectId}`, {
        partition: this.accountId,
        type: 'multipart',
        data: {
          userkey: userKey,
        },
      });
    } catch (error) {
      this.logger.error('Failed to clean up project', error);
    }
  }

  async onPostFileSubmission(
    postData: PostData<NewgroundsFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    // Step 1: Get the user key from the page
    const userKey: string = await BrowserWindowUtils.runScriptOnPage(
      this.accountId,
      `${this.BASE_URL}/projects/art/new`,
      'return PHP.get("uek")',
      300,
    );

    if (!userKey) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Could not get userkey'))
        .atStage('get userkey');
    }

    cancellationToken.throwIfCancelled();

    // Step 2: Initialize the project
    const initRes = await new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('PHP_SESSION_UPLOAD_PROGRESS', 'projectform')
      .setField('init_project', '1')
      .setField('userkey', userKey)
      .send<NewgroundsPostResponse>(`${this.BASE_URL}/projects/art/new`);

    if (
      !initRes.body.project_id ||
      !this.checkIsSaved(initRes.body as NewgroundsPostResponse)
    ) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Could not initialize post to Newgrounds'))
        .withAdditionalInfo(initRes.body)
        .atStage('initialize project');
    }

    const { edit_url: editUrl, project_id: projectId } = initRes.body;

    try {
      // Step 3: Upload the file and thumbnail
      const primaryFile = files[0];

      const fileUploadBuilder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('userkey', userKey)
        .setField('link_icon', '1')
        .addFile('new_image', primaryFile);

      if (primaryFile.thumbnail) {
        fileUploadBuilder.addThumbnail('thumbnail', primaryFile);
      }

      const fileUploadRes = await fileUploadBuilder.send<
        NewgroundsPostResponse & {
          linked_icon: number;
          image: Record<string, unknown>;
        }
      >(editUrl);

      if (
        !fileUploadRes.body.image ||
        !this.checkIsSaved(fileUploadRes.body as NewgroundsPostResponse)
      ) {
        await this.cleanUpFailedProject(projectId, userKey);
        return PostResponse.fromWebsite(this)
          .withException(new Error('Could not upload file to Newgrounds'))
          .withAdditionalInfo(fileUploadRes.body)
          .atStage('upload file');
      }

      const { linked_icon: linkedIcon } = fileUploadRes.body;

      // Step 4: Link the image
      const linkImageRes = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('userkey', userKey)
        .setField('art_image_sort', `[${linkedIcon}]`)
        .send<NewgroundsPostResponse>(editUrl);

      if (!this.checkIsSaved(linkImageRes.body)) {
        await this.cleanUpFailedProject(projectId, userKey);
        return PostResponse.fromWebsite(this)
          .withException(new Error('Could not link image'))
          .withAdditionalInfo(linkImageRes.body)
          .atStage('link image');
      }

      // Step 5: Set the description
      await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('PHP_SESSION_UPLOAD_PROGRESS', 'projectform')
        .setField('userkey', userKey)
        .setField('encoder', 'quill')
        .setField(
          'option[longdescription]',
          this.parseDescription(postData.options.description),
        )
        .send<NewgroundsPostResponse>(editUrl);

      // Step 6: Update content properties one by one (mimics website behavior)
      const { options } = postData;
      const updateProps = {
        title: postData.options.title,
        'option[tags]': this.formatTags(postData.options.tags).join(','),
        'option[include_in_portal]': options.sketch ? '0' : '1',
        'option[use_creative_commons]': options.creativeCommons ? '1' : '0',
        'option[cc_commercial]': options.commercial ? 'yes' : 'no',
        'option[cc_modifiable]': options.modification ? 'yes' : 'no',
        'option[genreid]': options.category,
        'option[nudity]': options.nudity,
        'option[violence]': options.violence,
        'option[language_textual]': options.explicitText,
        'option[adult_themes]': options.adultThemes,
      };

      let contentUpdateRes;
      for (const [key, value] of Object.entries(updateProps)) {
        // Wait between requests to avoid overwhelming the server
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });

        contentUpdateRes = await new PostBuilder(this, cancellationToken)
          .asMultipart()
          .setField('PHP_SESSION_UPLOAD_PROGRESS', 'projectform')
          .setField('userkey', userKey)
          .setField(key, value)
          .send<NewgroundsPostResponse>(editUrl);
      }

      if (!this.checkIsSaved(contentUpdateRes.body)) {
        await this.cleanUpFailedProject(projectId, userKey);
        return PostResponse.fromWebsite(this)
          .withException(new Error('Could not update content'))
          .withAdditionalInfo(contentUpdateRes.body)
          .atStage('update content');
      }

      // Check for errors in the response
      const resKeys = Object.entries(contentUpdateRes.body).filter(([key]) =>
        key.endsWith('_error'),
      );
      if (resKeys.length > 0) {
        await this.cleanUpFailedProject(projectId, userKey);
        const errorMessages = resKeys.map(([, value]) => value).join('\n');
        return PostResponse.fromWebsite(this)
          .withException(
            new Error(`Could not update content:\n${errorMessages}`),
          )
          .withAdditionalInfo(contentUpdateRes.body)
          .atStage('content validation');
      }

      cancellationToken.throwIfCancelled();

      // Step 7: Publish the project
      if (contentUpdateRes.body.can_publish) {
        const publishRes = await new PostBuilder(this, cancellationToken)
          .asMultipart()
          .setField('userkey', userKey)
          .setField('submit', '1')
          .setField('agree', 'Y')
          .setField('__ng_design', '2015')
          .send<string>(`${this.BASE_URL}/projects/art/${projectId}/publish`);

        PostResponse.validateBody(this, publishRes);

        return PostResponse.fromWebsite(this)
          .withSourceUrl(publishRes.responseUrl)
          .withMessage('File posted successfully')
          .withAdditionalInfo(publishRes.body);
      }

      await this.cleanUpFailedProject(projectId, userKey);
      return PostResponse.fromWebsite(this)
        .withException(
          new Error('Could not publish content. It may be missing data'),
        )
        .withAdditionalInfo(contentUpdateRes.body)
        .atStage('publish check');
    } catch (error) {
      // Clean up on any error
      await this.cleanUpFailedProject(projectId, userKey);
      throw error;
    }
  }

  async onValidateFileSubmission(
    postData: PostData<NewgroundsFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<NewgroundsFileSubmission>();

    return validator.result;
  }

  createMessageModel(): NewgroundsMessageSubmission {
    return new NewgroundsMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<NewgroundsMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    // Step 1: Get the page to extract userkey
    const page = await Http.get<string>(`${this.BASE_URL}/account/news/post`, {
      partition: this.accountId,
    });

    PostResponse.validateBody(this, page);

    // Extract userkey from the page
    const $ = parse(page.body);
    const userKey = $.querySelector('input[name="userkey"]')?.getAttribute(
      'value',
    );

    if (!userKey) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Could not retrieve userkey'))
        .withAdditionalInfo(page.body)
        .atStage('get userkey');
    }

    cancellationToken.throwIfCancelled();

    // Step 2: Submit the news post
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('post_id', '')
      .setField('userkey', userKey)
      .setField('subject', postData.options.title)
      .setField('emoticon', '6')
      .setField('comments_pref', '1')
      .setField('tag', '')
      .setField('body', `<p>${postData.options.description}</p>`)
      .setField(
        'suitability',
        this.getSuitabilityRating(postData.options.rating),
      )
      .withHeaders({
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://www.newgrounds.com',
        Referer: `https://www.newgrounds.com/account/news/post`,
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: '*/*',
        'Content-Type': 'multipart/form-data',
      });

    // Add tags as array
    const formattedTags = this.formatTags(postData.options.tags);
    for (const tag of formattedTags) {
      builder.setField('tags[]', tag);
    }

    const post = await builder.send<{ url: string }>(
      `${this.BASE_URL}/account/news/post`,
    );

    // Check if the response has a URL (success indicator)
    if (typeof post.body !== 'string' && post.body.url) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(post.body.url)
        .withMessage('News post submitted successfully')
        .withAdditionalInfo(post.body);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Failed to post news'))
      .withAdditionalInfo(post.body);
  }

  onValidateMessageSubmission = validatorPassthru;
}
