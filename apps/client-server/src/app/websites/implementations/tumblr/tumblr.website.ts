import { Http } from '@postybirb/http';
import {
  DynamicObject,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import parse from 'node-html-parser';
import { DescriptionNode } from '../../../post-parsers/models/description-node/description-node.base';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { WithCustomDescriptionParser } from '../../models/website-modifiers/with-custom-description-parser';
import { Website } from '../../website';
import { convertToNpf } from './block-to-npf';
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

// TODO - Figure out custom shortcut insertions
// TODO - Posting Images
// TODO - NSFW Flag Values
@WebsiteMetadata({
  name: 'tumblr',
  displayName: 'Tumblr',
})
@UserLoginFlow('https://www.tumblr.com')
@SupportsFiles(['image/png', 'image/jpeg'])
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

    if (!userInfo) {
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
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const formData = {
      file: files[0].toPostFormat(),
      thumb: files[0].thumbnailToPostFormat(),
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
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

  async onPostMessageSubmission(
    postData: PostData<TumblrMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    // Need to unwrap description from JSON string to NPF
    const description = JSON.parse(
      `[${postData.options.description.replaceAll('\n', ',')}]`,
    ).flat();
    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .withHeader('Authorization', `Bearer ${this.sessionData.apiToken}`)
      .withHeader('Referer', 'https://www.tumblr.com/new/text')
      .withHeader('Origin', 'https://www.tumblr.com')
      .withHeader('X-Csrf', this.sessionData.csrf)
      .setField('community_label_categories', [])
      .setField('content', description)
      .setField(
        'has_community_label',
        postData.options.rating !== SubmissionRating.GENERAL,
      )
      .setField('hide_trail', false)
      .setField('layout', [
        {
          type: 'rows',
          display: description.map((block, index) => ({ blocks: [index] })),
        },
      ])
      .setField('tags', postData.options.tags?.join(', '));

    const blogId = postData.options.blog;
    const result = await builder.send<TumblrPostResponse>(
      `https://www.tumblr.com/api/v2/blog/${blogId}/posts`,
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

  onDescriptionParse(node: DescriptionNode): string {
    // Convert to NPF and return as JSON string to satisfy and unpack later
    const npf = convertToNpf(node);
    return JSON.stringify(npf);
  }

  onAfterDescriptionParse(description: string) {
    return description;
  }
}
