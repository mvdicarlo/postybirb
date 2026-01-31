// BlockNote types are used in the UI, but conversion happens via DescriptionNode
// No need to import BlockNote in the server-side website implementation
import { Http } from '@postybirb/http';
import {
  DynamicObject,
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
import { BaseConverter } from '../../../post-parsers/models/description-node/converters/base-converter';
import { NpfConverter } from '../../../post-parsers/models/description-node/converters/npf-converter';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { WithCustomDescriptionParser } from '../../models/website-modifiers/with-custom-description-parser';
import { Website } from '../../website';
import { TumblrAccountData } from './models/tumblr-account-data';
import { TumblrFileSubmission } from './models/tumblr-file-submission';
import { TumblrMessageSubmission } from './models/tumblr-message-submission';

type TumblrSessionData = {
  apiToken?: string;
  state: DynamicObject;
  csrf: string;
};

type TumblrPostResponse = {
  meta: {
    msg: string;
    status: number;
  };
  response: {
    displayText: string;
    id: string;
    state: string;
  };
};

@WebsiteMetadata({
  name: 'tumblr',
  displayName: 'Tumblr',
})
@UserLoginFlow('https://www.tumblr.com')
@SupportsUsernameShortcut({
  id: 'tumblr',
  url: 'https://www.tumblr.com/blog/$1',
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/jfif',
    'image/pjpeg',
    'image/webp',
    'audio/mp3',
    'audio/mpeg',
    'video/quicktime',
    'video/x-m4v',
    'video/mp4',
  ],
  fileBatchSize: 30,
  acceptedFileSizes: {
    [FileType.AUDIO]: FileSize.megabytes(10),
    [FileType.VIDEO]: FileSize.megabytes(500),
    [FileType.IMAGE]: FileSize.megabytes(20),
    'image/gif': FileSize.megabytes(3),
  },
})
export default class Tumblr
  extends Website<TumblrAccountData, TumblrSessionData>
  implements
    FileWebsite<TumblrFileSubmission>,
    MessageWebsite<TumblrMessageSubmission>,
    WithCustomDescriptionParser
{
  protected BASE_URL = 'https://www.tumblr.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TumblrAccountData> =
    {
      blogs: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const page = await Http.get<string>(`${this.BASE_URL}`, {
      partition: this.accountId,
    });

    const root = parse(page.body);
    const initialState = root.querySelector('#___INITIAL_STATE___').innerText;
    const cleanedState = initialState.trim().replace(/\\\\"/g, '\\"');
    const data = JSON.parse(cleanedState);
    const apiToken = data?.apiFetchStore?.API_TOKEN;

    if (!apiToken) {
      this.loginState.logout();
      return this.loginState;
    }

    this.sessionData.apiToken = apiToken;
    this.sessionData.state = data;
    this.sessionData.csrf = data.csrfToken;
    const userInfo = data.queries.queries.find((query) =>
      query.queryHash.includes('user-info'),
    );

    if (!userInfo || userInfo?.state?.data?.isLoggedIn === false) {
      this.loginState.logout();
      return this.loginState;
    }

    const userName = userInfo.state.data.user.name;

    await this.setWebsiteData({
      blogs: userInfo.state.data.user.blogs.map((blog) => ({
        label: blog.name,
        value: blog.uuid,
        data: blog,
      })),
    });
    return this.loginState.setLogin(true, userName);
  }

  createFileModel(): TumblrFileSubmission {
    return new TumblrFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TumblrFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    // Description is a JSON string of NPF blocks from the NpfConverter
    const npfBlocks = JSON.parse(postData.options.description);

    const blogId = postData.options.blog;

    // Upload files and add them as NPF media blocks
    const mediaBlocks = await this.uploadFiles(
      files,
      blogId,
      cancellationToken,
    );

    // Combine description blocks with media blocks
    const allBlocks = [...npfBlocks, ...mediaBlocks];

    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .withHeader('Authorization', `Bearer ${this.sessionData.apiToken}`)
      .withHeader('Referer', 'https://www.tumblr.com/new/text')
      .withHeader('Origin', 'https://www.tumblr.com')
      .withHeader('X-Csrf', this.sessionData.csrf)
      .setField(
        'community_label_categories',
        this.getCommunityLabelCategories(postData),
      )
      .setField('content', allBlocks)
      .setField(
        'has_community_label',
        postData.options.rating !== SubmissionRating.GENERAL,
      )
      .setField('hide_trail', false)
      .setField('layout', [
        {
          type: 'rows',
          display: allBlocks.map((block, index) => ({ blocks: [index] })),
        },
      ])
      .setField('tags', postData.options.tags?.join(', '));

    const result = await builder.send<TumblrPostResponse>(
      `${this.BASE_URL}/api/v2/blog/${blogId}/posts`,
    );

    if (
      result.body.response.state === 'published' ||
      result.body.response.state === 'transcoding' // publishing video
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const blogData = this.getWebsiteData().blogs.find(
        (b) => b.value === blogId,
      )!;
      const postUrl = `${blogData.data.url}/${result.body.response.id}`;
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(result.body)
        .withSourceUrl(postUrl);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateFileSubmission(
    postData: PostData<TumblrFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TumblrFileSubmission>();

    return validator.result;
  }

  createMessageModel(): TumblrMessageSubmission {
    return new TumblrMessageSubmission();
  }

  getDescriptionConverter(): BaseConverter {
    return new NpfConverter();
  }

  async onPostMessageSubmission(
    postData: PostData<TumblrMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    // Description is a JSON string of NPF blocks from the NpfConverter
    const npfBlocks = JSON.parse(postData.options.description);

    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .withHeader('Authorization', `Bearer ${this.sessionData.apiToken}`)
      .withHeader('Referer', 'https://www.tumblr.com')
      .withHeader('Origin', 'https://www.tumblr.com')
      .withHeader('X-Csrf', this.sessionData.csrf)
      .setField(
        'community_label_categories',
        this.getCommunityLabelCategories(postData),
      )
      .setField('content', npfBlocks)
      .setField(
        'has_community_label',
        postData.options.rating !== SubmissionRating.GENERAL,
      )
      .setField('hide_trail', false)
      .setField('layout', [
        {
          type: 'rows',
          display: npfBlocks.map((block, index) => ({ blocks: [index] })),
        },
      ])
      .setField('tags', postData.options.tags?.join(', '));

    const blogId = postData.options.blog;
    const result = await builder.send<TumblrPostResponse>(
      `${this.BASE_URL}/api/v2/blog/${blogId}/posts`,
    );

    if (result.body.response.state === 'published') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const blogData = this.getWebsiteData().blogs.find(
        (b) => b.value === blogId,
      )!;
      const postUrl = `${blogData.data.url}/${result.body.response.id}`;
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(result.body)
        .withSourceUrl(postUrl);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateMessageSubmission(
    postData: PostData<TumblrMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TumblrMessageSubmission>();

    return validator.result;
  }

  private getCommunityLabelCategories(
    postData: PostData<TumblrMessageSubmission | TumblrFileSubmission>,
  ): string[] {
    const labels = [];
    const { options } = postData;
    if (options.rating === SubmissionRating.GENERAL) {
      return [];
    }

    if (options.drugUse) {
      labels.push('drug_use');
    }

    if (options.violence) {
      labels.push('violence');
    }

    if (options.sexualContent) {
      labels.push('sexual_content');
    }

    return labels;
  }

  /**
   * Uploads files to Tumblr and returns NPF media blocks
   */
  private async uploadFiles(
    files: PostingFile[],
    blogId: string,
    cancellationToken: CancellableToken,
  ): Promise<DynamicObject[]> {
    const mediaBlocks: DynamicObject[] = [];

    for (const file of files) {
      cancellationToken.throwIfCancelled();

      try {
        const uploadedMedia = await this.uploadSingleFile(file, blogId);

        // Create NPF media block based on file type
        if (file.fileType === FileType.IMAGE) {
          mediaBlocks.push({
            type: 'image',
            media: uploadedMedia,
            alt_text: file.metadata?.altText || '',
            provider: 'tumblr',
          });
        } else if (file.fileType === FileType.VIDEO) {
          mediaBlocks.push({
            type: 'video',
            provider: 'tumblr',
            media: uploadedMedia[0],
          });
        } else if (file.fileType === FileType.AUDIO) {
          mediaBlocks.push({
            type: 'audio',
            provider: 'tumblr',
            media: uploadedMedia[0],
          });
        }
      } catch (error) {
        this.logger.error(`Failed to upload file ${file.fileName}`, error);
        throw error;
      }
    }

    return mediaBlocks;
  }

  private getMediaType(file: PostingFile): string {
    switch (file.fileType) {
      case FileType.AUDIO:
        return 'audio';
      case FileType.IMAGE:
        return 'image';
      case FileType.VIDEO:
        return 'video';
      default:
        throw new Error('Unsupported file type');
    }
  }

  /**
   * Uploads a single file to Tumblr and returns media information
   * @param file - The file to upload
   * @param blogId - The blog ID to upload to (optional, uses first blog if not provided)
   */
  private async uploadSingleFile(
    file: PostingFile,
    blogId: string,
  ): Promise<DynamicObject[]> {
    // Upload file using multipart form data
    const uploadBuilder = new PostBuilder(this, new CancellableToken())
      .asMultipart()
      .withHeader('Authorization', `Bearer ${this.sessionData.apiToken}`)
      .withHeader('Referer', 'https://www.tumblr.com')
      .withHeader('Origin', 'https://www.tumblr.com')
      .withHeader('X-Csrf', this.sessionData.csrf)
      .addFile('file', file);

    const uploadResult = await uploadBuilder.send<{
      meta: { status: number; msg: string };
      response: {
        id?: string;
        url?: string;
        width?: number;
        height?: number;
      };
    }>(`${this.BASE_URL}/api/v2/media/${this.getMediaType(file)}`);

    if (!uploadResult.body.response?.url) {
      throw new Error('Failed to upload file - no URL returned');
    }

    // Return media object(s) in Tumblr NPF format
    return [uploadResult.body.response];
  }
}
