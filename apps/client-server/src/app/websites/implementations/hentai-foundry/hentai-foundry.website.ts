import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse,
} from '@postybirb/types';
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
import { HentaiFoundryAccountData } from './models/hentai-foundry-account-data';
import { HentaiFoundryFileSubmission } from './models/hentai-foundry-file-submission';
import { HentaiFoundryMessageSubmission } from './models/hentai-foundry-message-submission';

@WebsiteMetadata({
  name: 'hentai-foundry',
  displayName: 'H Foundry',
})
@UserLoginFlow('https://www.hentai-foundry.com')
@SupportsUsernameShortcut({
  id: 'h-foundry',
  url: 'https://www.hentai-foundry.com/user/$1',
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/svg+xml',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(2),
  },
})
export default class HentaiFoundry
  extends Website<HentaiFoundryAccountData>
  implements
    FileWebsite<HentaiFoundryFileSubmission>,
    MessageWebsite<HentaiFoundryMessageSubmission>
{
  protected BASE_URL = 'https://www.hentai-foundry.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<HentaiFoundryAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(this.BASE_URL, {
        partition: this.accountId,
      });

      if (res.body?.includes('Logout')) {
        const $ = parse(res.body);
        const username =
          res.body.match(/class=.navlink. href=.\/user\/(.*?)\//)?.[1] ||
          'Unknown';
        return this.loginState.setLogin(true, username);
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }

  createFileModel(): HentaiFoundryFileSubmission {
    return new HentaiFoundryFileSubmission();
  }

  createMessageModel(): HentaiFoundryMessageSubmission {
    return new HentaiFoundryMessageSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    if (
      file.width > 1500 ||
      file.height > 1500 ||
      file.size > FileSize.megabytes(2)
    ) {
      return {
        height: 1500,
        width: 1500,
        maxBytes: FileSize.megabytes(2),
      };
    }
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<HentaiFoundryFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    // Get the form page first
    const page = await Http.get<string>(`${this.BASE_URL}/pictures/create`, {
      partition: this.accountId,
    });

    PostResponse.validateBody(this, page);

    const csrfToken = parse(page.body)
      .querySelector('input[name="YII_CSRF_TOKEN"]')
      ?.getAttribute('value');
    const userId = parse(page.body)
      .querySelector('input[name="Pictures[user_id]"]')
      ?.getAttribute('value');

    if (!csrfToken || !userId) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(page.body)
        .withException(new Error('Failed to retrieve CSRF token or user ID'));
    }

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('YII_CSRF_TOKEN', csrfToken)
      .setField('Pictures[user_id]', userId)
      .setField('Pictures[title]', postData.options.title)
      .setField('Pictures[description]', postData.options.description)
      .setField(
        'Pictures[edit_tags]',
        this.formatTags(postData.options.tags).join(', '),
      )
      .addFile('Pictures[fileupload]', files[0])
      .setField('Pictures[submissionPolicyAgree]', '1')
      .setField('yt0', 'Create')
      .setConditional('Pictures[is_scrap]', postData.options.scraps, '1', '0')
      .setConditional(
        'Pictures[comments_type]',
        postData.options.disableComments,
        '-1',
        '0',
      )
      .setField('Pictures[categoryHier]', postData.options.category || '')
      .setField('Pictures[rating_nudity]', postData.options.nudityRating)
      .setField('Pictures[rating_violence]', postData.options.violenceRating)
      .setField('Pictures[rating_profanity]', postData.options.profanityRating)
      .setField('Pictures[rating_racism]', postData.options.racismRating)
      .setField('Pictures[rating_sex]', postData.options.sexRating)
      .setField('Pictures[rating_spoilers]', postData.options.spoilersRating)
      .setConditional('Pictures[rating_yaoi]', postData.options.yaoi, '1', '0')
      .setConditional('Pictures[rating_yuri]', postData.options.yuri, '1', '0')
      .setConditional('Pictures[rating_teen]', postData.options.teen, '1', '0')
      .setConditional('Pictures[rating_guro]', postData.options.guro, '1', '0')
      .setConditional(
        'Pictures[rating_furry]',
        postData.options.furry,
        '1',
        '0',
      )
      .setConditional(
        'Pictures[rating_beast]',
        postData.options.beast,
        '1',
        '0',
      )
      .setConditional('Pictures[rating_male]', postData.options.male, '1', '0')
      .setConditional(
        'Pictures[rating_female]',
        postData.options.female,
        '1',
        '0',
      )
      .setConditional('Pictures[rating_futa]', postData.options.futa, '1', '0')
      .setConditional(
        'Pictures[rating_other]',
        postData.options.other,
        '1',
        '0',
      )
      .setConditional('Pictures[rating_scat]', postData.options.scat, '1', '0')
      .setConditional(
        'Pictures[rating_incest]',
        postData.options.incest,
        '1',
        '0',
      )
      .setConditional('Pictures[rating_rape]', postData.options.rape, '1', '0')
      .setField('Pictures[media_id]', postData.options.media)
      .setField('Pictures[time_taken]', postData.options.timeTaken || '')
      .setField('Pictures[reference]', postData.options.reference || '')
      .setField('Pictures[license_id]', '0');

    const postResponse = await builder.send<string>(
      `${this.BASE_URL}/pictures/create`,
    );

    if (!postResponse.body.includes('Pictures_title')) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(postResponse.responseUrl)
        .withMessage('File posted successfully')
        .withAdditionalInfo(postResponse.body);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Failed to post file submission'))
      .withAdditionalInfo(postResponse.body);
  }

  async onPostMessageSubmission(
    postData: PostData<HentaiFoundryMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const page = await Http.get<string>(`${this.BASE_URL}/UserBlogs/create`, {
      partition: this.accountId,
    });

    PostResponse.validateBody(this, page);

    const csrfToken = parse(page.body)
      .querySelector('input[name="YII_CSRF_TOKEN"]')
      ?.getAttribute('value');

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('YII_CSRF_TOKEN', csrfToken)
      .setField('UserBlogs[blog_title]', postData.options.title)
      .setField('UserBlogs[blog_body]', postData.options.description);

    const postResponse = await builder.send<string>(
      `${this.BASE_URL}/UserBlogs/create`,
    );

    if (postResponse.responseUrl) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(postResponse.responseUrl)
        .withMessage('Blog post created successfully')
        .withAdditionalInfo(postResponse.body);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Failed to post blog'))
      .withAdditionalInfo(postResponse.body);
  }

  private formatTags(tags: string[]): string[] {
    const maxLength = 500;
    const formattedTags = tags.filter((tag) => tag.length >= 3);
    const tagString = formattedTags.join(', ').trim();

    if (tagString.length > maxLength) {
      return tagString
        .substring(0, maxLength)
        .split(', ')
        .filter((tag) => tag.length >= 3);
    }

    return formattedTags;
  }

  onValidateFileSubmission = validatorPassthru;

  onValidateMessageSubmission = validatorPassthru;
}
