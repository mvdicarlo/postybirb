import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
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
import { ArtconomyAccountData } from './models/artconomy-account-data';
import { ArtconomyFileSubmission } from './models/artconomy-file-submission';
import { ArtconomyMessageSubmission } from './models/artconomy-message-submission';

@WebsiteMetadata({
  name: 'artconomy',
  displayName: 'Artconomy',
})
@UserLoginFlow('https://artconomy.com/auth/login')
@SupportsUsernameShortcut({
  id: 'artconomy',
  url: 'https://artconomy.com/profile/$1/about',
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'video/mp4',
    'application/msword',
    'application/rtf',
    'text/plain',
    'audio/mp3',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(49),
  },
})
export default class Artconomy
  extends Website<ArtconomyAccountData>
  implements
    FileWebsite<ArtconomyFileSubmission>,
    MessageWebsite<ArtconomyMessageSubmission>
{
  protected BASE_URL = 'https://artconomy.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<ArtconomyAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    try {
      const authCheck = await Http.get<{ username: string; id: number }>(
        `${this.BASE_URL}/api/profiles/data/requester/`,
        {
          partition: this.accountId,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (authCheck.statusCode === 200 && authCheck.body.username !== '_') {
        // Get CSRF token from cookies
        const cookies = await Http.getWebsiteCookies(
          this.accountId,
          this.BASE_URL,
        );
        const csrfCookie = cookies.find((c) => c.name === 'csrftoken');
        await this.setWebsiteData({
          id: authCheck.body.id,
          username: authCheck.body.username,
          csrfToken: csrfCookie?.value || '',
        });
        return this.loginState.setLogin(true, authCheck.body.username);
      }

      return this.loginState.setLogin(false, null);
    } catch (error) {
      return this.loginState.setLogin(false, null);
    }
  }

  createFileModel(): ArtconomyFileSubmission {
    return new ArtconomyFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<ArtconomyFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const { id, username, csrfToken } = this.getWebsiteData();

    if (!id || !username || !csrfToken) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Not properly logged in to Artconomy'),
      );
    }

    // Upload primary asset using PostBuilder
    const primaryUpload = await new PostBuilder(this, cancellationToken)
      .asMultipart()
      .addFile('files[]', files[0])
      .withHeader('X-CSRFTOKEN', csrfToken)
      .withHeader('Referer', this.BASE_URL)
      .send<{ id: string }>(`${this.BASE_URL}/api/lib/asset/`);

    if (!primaryUpload.body?.id) {
      return PostResponse.fromWebsite(this)
        .withException(
          new Error(
            `Asset upload failed: ${primaryUpload.statusMessage || 'Unknown error'}`,
          ),
        )
        .withAdditionalInfo(primaryUpload.body);
    }

    const primaryAsset = primaryUpload.body.id;
    let thumbnailAsset: string | null = null;

    // Upload thumbnail if available
    if (files[0].thumbnail) {
      const thumbnailUpload = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .addThumbnail('files[]', files[0])
        .withHeader('X-CSRFTOKEN', csrfToken)
        .withHeader('Referer', this.BASE_URL)
        .send<{ id: string }>(`${this.BASE_URL}/api/lib/asset/`);

      if (!thumbnailUpload.body?.id) {
        return PostResponse.fromWebsite(this)
          .withException(
            new Error(
              `Thumbnail upload failed: ${thumbnailUpload.statusMessage || 'Unknown error'}`,
            ),
          )
          .withAdditionalInfo(thumbnailUpload.body);
      }
      thumbnailAsset = thumbnailUpload.body.id;
    }

    cancellationToken.throwIfCancelled();

    // Create submission using PostBuilder
    const postResponse = await new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('file', primaryAsset)
      .setField('preview', thumbnailAsset)
      .setField('title', postData.options.title)
      .setField('caption', postData.options.description)
      .setField('tags', postData.options.tags)
      .setField('rating', this.getRating(postData.options.rating))
      .setField('private', postData.options.isPrivate)
      .setField('comments_disabled', postData.options.commentsDisabled)
      .setConditional('artists', postData.options.isArtist, [id], [])
      .withHeader('X-CSRFTOKEN', csrfToken)
      .withHeader('Referer', this.BASE_URL)
      .send<{
        id: string;
      }>(`${this.BASE_URL}/api/profiles/account/${username}/submissions/`);

    if (!postResponse.body?.id) {
      return PostResponse.fromWebsite(this)
        .withException(
          new Error(
            `Submission creation failed: ${postResponse.statusMessage || 'Unknown error'}`,
          ),
        )
        .withAdditionalInfo(postResponse.body);
    }

    return PostResponse.fromWebsite(this)
      .withSourceUrl(`${this.BASE_URL}/submissions/${postResponse.body.id}`)
      .withMessage('File posted successfully');
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): ArtconomyMessageSubmission {
    return new ArtconomyMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<ArtconomyMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const { username, csrfToken } = this.getWebsiteData();

    if (!username || !csrfToken) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Not properly logged in to Artconomy'),
      );
    }

    const postResponse = await new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('subject', postData.options.title)
      .setField('body', postData.options.description)
      .withHeader('X-CSRFTOKEN', csrfToken)
      .withHeader('Referer', this.BASE_URL)
      .send<{
        id: number;
      }>(`${this.BASE_URL}/api/profiles/account/${username}/journals/`);

    if (!postResponse.body?.id) {
      return PostResponse.fromWebsite(this)
        .withException(
          new Error(
            `Journal creation failed: ${postResponse.statusMessage || 'Unknown error'}`,
          ),
        )
        .withAdditionalInfo(postResponse.body);
    }

    return PostResponse.fromWebsite(this)
      .withSourceUrl(
        `${this.BASE_URL}/profile/${username}/journals/${postResponse.body.id}`,
      )
      .withMessage('Journal posted successfully');
  }

  onValidateMessageSubmission = validatorPassthru;

  private getRating(rating: SubmissionRating): number {
    switch (rating) {
      case SubmissionRating.GENERAL:
        return 0;
      case SubmissionRating.MATURE:
        return 1;
      case SubmissionRating.ADULT:
        return 2;
      case SubmissionRating.EXTREME:
        return 3;
      default:
        // Safest assumption
        return 2;
    }
  }
}
