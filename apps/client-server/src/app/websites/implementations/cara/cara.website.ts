import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import parse from 'node-html-parser';
import { v4 as uuid } from 'uuid';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { CaraAccountData } from './models/cara-account-data';
import { CaraFileSubmission } from './models/cara-file-submission';
import { CaraMessageSubmission } from './models/cara-message-submission';

type CaraPostResult = {
  data: {
    id: string;
    authorId: string;
    name: string;
    slug: string;
    photo: string;
    createdAt: string;
    content: string;
    images: string[];
    likeCounter: number;
    bookmarked: boolean;
    commentCounter: number;
    liked: boolean;
    status: string;
    addToPortfolio: boolean;
    mentions: unknown[];
    coverImage: string;
    title: string;
    isRepost: boolean;
    quotedPostId: string | null;
    quotedPost: unknown | null;
    repostCounter: number;
    reposted: boolean;
    embeddedLink: boolean;
    author_status: string;
    publicCoffeeBadge: boolean;
    pinnedCommentId: string | null;
  };
};

@WebsiteMetadata({
  name: 'cara',
  displayName: 'Cara',
})
@UserLoginFlow('https://cara.app/login')
@SupportsFiles({
  fileBatchSize: 4,
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/bmp',
    'image/jpeg',
    'image/apng',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/gif',
    'image/heif',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/x-xbitmap',
    'image/bmp',
    'image/tiff',
    'image/jpeg',
    'image/avif',
  ],
})
@SupportsUsernameShortcut({
  id: 'cara',
  url: 'https://cara.app/$1',
  convert: (websiteName, shortcut) => {
    if (websiteName === 'cara' && shortcut === 'cara') {
      return '@$1';
    }

    return undefined;
  },
})
export default class Cara
  extends Website<CaraAccountData>
  implements
    FileWebsite<CaraFileSubmission>,
    MessageWebsite<CaraMessageSubmission>
{
  protected BASE_URL = 'https://cara.app';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<CaraAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    const { body, responseUrl } = await Http.get<string>(
      `${this.BASE_URL}/settings`,
      {
        partition: this.accountId,
      },
    );

    if (!responseUrl?.includes('/login')) {
      const $ = parse(body);
      const username =
        $.querySelector('input[name="slug"]')?.getAttribute('value') ??
        'Unknown';
      return this.loginState.setLogin(true, username);
    }

    return this.loginState.logout();
  }

  createFileModel(): CaraFileSubmission {
    return new CaraFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private async uploadImage(
    file: PostingFile,
    postId: string,
    username: string,
    cancellationToken: CancellableToken,
  ): Promise<{
    imageId: string;
    coverImageId: string;
  }> {
    cancellationToken.throwIfCancelled();

    // Step 1: Get S3 upload credentials for primary image
    const primaryImageUploadRequest = {
      filename: file.fileName,
      filetype: file.mimeType,
      _nextS3: { strategy: 'aws-sdk' },
      uploadType: 'POST_CONTENT',
      postId,
      name: username,
    };

    const primaryUploadResponse = await Http.post<{
      token: {
        Credentials: {
          AccessKeyId: string;
          SecretAccessKey: string;
          SessionToken: string;
        };
      };
      key: string;
      bucket: string;
      region: string;
    }>(`${this.BASE_URL}/api/s3-upload`, {
      partition: this.accountId,
      type: 'json',
      data: primaryImageUploadRequest,
    });

    if (primaryUploadResponse.statusCode !== 200 || !primaryUploadResponse.body) {
      throw new Error('Failed to get S3 upload credentials for primary image');
    }

    cancellationToken.throwIfCancelled();

    // Step 2: Upload primary image to S3
    const primaryS3Url = `https://${primaryUploadResponse.body.bucket}.s3.${primaryUploadResponse.body.region}.amazonaws.com/${primaryUploadResponse.body.key}?x-id=PutObject`;

    await Http.post(primaryS3Url, {
      partition: this.accountId,
      type: 'binary',
      data: file.buffer,
      headers: {
        'Content-Type': file.mimeType,
        'x-amz-security-token':
          primaryUploadResponse.body.token.Credentials.SessionToken,
      },
    });

    cancellationToken.throwIfCancelled();

    // Step 3: Get S3 upload credentials for cover image (thumbnail)
    const coverImageUploadRequest = {
      filename: 'post-cover-image.jpeg',
      filetype: '',
      _nextS3: { strategy: 'aws-sdk' },
      uploadType: 'POST_CONTENT',
      postId,
      name: username,
    };

    const coverUploadResponse = await Http.post<{
      token: {
        Credentials: {
          AccessKeyId: string;
          SecretAccessKey: string;
          SessionToken: string;
        };
      };
      key: string;
      bucket: string;
      region: string;
    }>(`${this.BASE_URL}/api/s3-upload`, {
      partition: this.accountId,
      type: 'json',
      data: coverImageUploadRequest,
    });

    if (coverUploadResponse.statusCode !== 200 || !coverUploadResponse.body) {
      throw new Error('Failed to get S3 upload credentials for cover image');
    }

    cancellationToken.throwIfCancelled();

    // Step 4: Upload cover image (thumbnail) to S3
    const coverS3Url = `https://${coverUploadResponse.body.bucket}.s3.${coverUploadResponse.body.region}.amazonaws.com/${coverUploadResponse.body.key}?x-id=PutObject`;

    const thumbnailBuffer = file.thumbnail?.buffer || file.buffer;
    const thumbnailMimeType = file.thumbnail?.mimeType || file.mimeType;

    await Http.post(coverS3Url, {
      partition: this.accountId,
      type: 'binary',
      data: thumbnailBuffer,
      headers: {
        'Content-Type': thumbnailMimeType,
        'x-amz-security-token':
          coverUploadResponse.body.token.Credentials.SessionToken,
      },
    });

    return {
      imageId: primaryUploadResponse.body.key,
      coverImageId: coverUploadResponse.body.key,
    };
  }

  async onPostFileSubmission(
    postData: PostData<CaraFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const hasImage = files.some((f) => f.fileType === FileType.IMAGE);

    // Generate a post ID for the upload
    const postId = uuid();
    const username = this.loginState.username || 'unknown';

    const imageUploads: {
      imageId: string;
      coverImageId: string;
    }[] = [];
    
    for (const file of files) {
      const uploadResult = await this.uploadImage(
        file,
        postId,
        username,
        cancellationToken,
      );
      imageUploads.push(uploadResult);
    }

    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('addToPortfolio', postData.options.addToPortfolio)
      .setField('content', postData.options.description)
      .setField('title', '')
      .setField('hasEmbed', false)
      .setField('hasImage', hasImage)
      .setField('mentions', [])
      .setField('quotedId', null)
      .setField('tags', []);

    const post = await builder.send<CaraPostResult>(
      `${this.BASE_URL}/api/posts`,
    );

    if (post.body?.data?.id) {
      const publishBuilder = new PostBuilder(this, cancellationToken).asJson();

      const publish = await publishBuilder.send<object>(
        `${this.BASE_URL}/api/posts/${post.body.data.id}/publish`,
      );

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(publish.body)
        .withSourceUrl(`${this.BASE_URL}/post/${post.body.data.id}`);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: post.body,
        statusCode: post.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateFileSubmission(
    postData: PostData<CaraFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<CaraFileSubmission>();
    const { rating } = postData.options;
    if (rating !== SubmissionRating.GENERAL) {
      validator.error(
        'validation.rating.unsupported-rating',
        { rating },
        'rating',
      );
    }
    return validator.result;
  }

  createMessageModel(): CaraMessageSubmission {
    return new CaraMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<CaraMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('addToPortfolio', false)
      .setField('content', postData.options.description)
      .setField('title', '')
      .setField('hasEmbed', false)
      .setField('hasImage', false)
      .setField('mentions', [])
      .setField('quotedId', null)
      .setField('tags', []);

    const post = await builder.send<CaraPostResult>(
      `${this.BASE_URL}/api/posts`,
    );

    if (post.body?.data?.id) {
      const publishBuilder = new PostBuilder(this, cancellationToken).asJson();

      const publish = await publishBuilder.send<object>(
        `${this.BASE_URL}/api/posts/${post.body.data.id}/publish`,
      );

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(publish.body)
        .withSourceUrl(`${this.BASE_URL}/post/${post.body.data.id}`);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: post.body,
        statusCode: post.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateMessageSubmission(
    postData: PostData<CaraMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<CaraFileSubmission>();
    const { rating } = postData.options;
    if (rating !== SubmissionRating.GENERAL) {
      validator.error(
        'validation.rating.unsupported-rating',
        { rating },
        'rating',
      );
    }
    return validator.result;
  }
}
