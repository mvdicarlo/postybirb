import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

type S3UploadCredentials = {
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
};

type S3UploadRequest = {
  filename: string;
  filetype: string;
  _nextS3: { strategy: string };
  uploadType: string;
  postId: string;
  name: string;
};

type CaraMediaItem = {
  id: string;
  src: string;
  isCoverImg: boolean;
  order: number;
  mediaSrc: null;
  isEmbed: boolean;
  embedType: null;
  isAiAutoFlagged: null;
  tags: Array<{
    value: string;
    type: string;
  }>;
};

type CaraUploadResult = CaraMediaItem[];

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
@DisableAds()
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

  /**
   * Request S3 upload credentials from Cara API
   */
  private async getS3UploadCredentials(
    uploadRequest: S3UploadRequest,
  ): Promise<S3UploadCredentials> {
    const response = await Http.post<S3UploadCredentials>(
      `${this.BASE_URL}/api/s3-upload`,
      {
        partition: this.accountId,
        type: 'json',
        data: uploadRequest,
      },
    );

    if (response.statusCode !== 200 || !response.body) {
      throw new Error(
        `Failed to get S3 upload credentials for ${uploadRequest.filename}`,
      );
    }

    return response.body;
  }

  /**
   * Upload a file to S3 using provided credentials
   */
  private async uploadToS3(
    credentials: S3UploadCredentials,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const { AccessKeyId, SecretAccessKey, SessionToken } =
      credentials.token.Credentials;

    const client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: AccessKeyId,
        secretAccessKey: SecretAccessKey,
        sessionToken: SessionToken,
      },
    });

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: credentials.bucket,
          Key: credentials.key,
          Body: buffer,
          ContentType: mimeType || 'application/octet-stream',
        }),
      );
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${String(error)}`);
    }
  }

  /**
   * Upload an image file to Cara (both primary image and thumbnail)
   */
  private async uploadImage(
    file: PostingFile,
    postId: string,
    username: string,
    uploadCover: boolean,
    order: number,
    cancellationToken: CancellableToken,
  ): Promise<CaraUploadResult> {
    cancellationToken.throwIfCancelled();

    // Upload primary image
    const primaryImageRequest: S3UploadRequest = {
      filename: file.fileName,
      filetype: file.mimeType,
      _nextS3: { strategy: 'aws-sdk' },
      uploadType: 'POST_CONTENT',
      postId,
      name: username,
    };

    const primaryCredentials =
      await this.getS3UploadCredentials(primaryImageRequest);

    cancellationToken.throwIfCancelled();

    await this.uploadToS3(primaryCredentials, file.buffer, file.mimeType);

    cancellationToken.throwIfCancelled();

    // Create primary media item
    const primaryMedia: CaraMediaItem = {
      id: uuid(),
      src: primaryCredentials.key,
      isCoverImg: false,
      order,
      mediaSrc: null,
      isEmbed: false,
      embedType: null,
      isAiAutoFlagged: null,
      tags: [],
    };

    let coverMedia: CaraMediaItem | undefined;
    if (uploadCover) {
      // Upload cover image (thumbnail)
      const coverImageRequest: S3UploadRequest = {
        filename: 'post-cover-image.jpeg',
        filetype: '',
        _nextS3: { strategy: 'aws-sdk' },
        uploadType: 'POST_CONTENT',
        postId,
        name: username,
      };

      const coverCredentials =
        await this.getS3UploadCredentials(coverImageRequest);

      cancellationToken.throwIfCancelled();

      const thumbnailBuffer = file.thumbnail?.buffer || file.buffer;
      const thumbnailMimeType = file.thumbnail?.mimeType || file.mimeType;

      await this.uploadToS3(
        coverCredentials,
        thumbnailBuffer,
        thumbnailMimeType,
      );

      // Create cover media item
      coverMedia = {
        id: 'cover',
        src: coverCredentials.key,
        isCoverImg: true,
        order: -1,
        mediaSrc: null,
        isEmbed: false,
        embedType: null,
        isAiAutoFlagged: null,
        tags: [],
      };
    }

    if (uploadCover && coverMedia) {
      return [primaryMedia, coverMedia];
    }
    return [primaryMedia];
  }

  async onPostFileSubmission(
    postData: PostData<CaraFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const hasImage = files.some((f) => f.fileType === FileType.IMAGE);

    // Generate a post ID for the upload
    const postId = uuid();
    const username = this.loginState.username || 'unknown';

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

    const imageUploads: CaraUploadResult = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadResult = await this.uploadImage(
        file,
        postId,
        username,
        i === 0, // Only upload cover for the first image
        i, // Order index
        cancellationToken,
      );
      imageUploads.push(...uploadResult);
    }

    const mediaBuilder = new PostBuilder(this, cancellationToken)
      .asJson()
      .withData({
        addToPortfolio: postData.options.addToPortfolio,
        postMedia: imageUploads,
      });

    const media = await mediaBuilder.send<CaraPostResult>(
      `${this.BASE_URL}/api/posts/${post.body.data.id}/media`,
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
