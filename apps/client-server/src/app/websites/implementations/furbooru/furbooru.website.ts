import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
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
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { FurbooruAccountData } from './models/furbooru-account-data';
import { FurbooruFileSubmission } from './models/furbooru-file-submission';

@WebsiteMetadata({
  name: 'furbooru',
  displayName: 'Furbooru',
})
@UserLoginFlow('https://furbooru.org/session/new')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/gif',
    'video/webm',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(100), // 100MB limit
  },
})
@DisableAds()
@SupportsUsernameShortcut({
  id: 'furbooru',
  url: 'https://furbooru.org/profiles/$1',
})
export default class Furbooru
  extends Website<FurbooruAccountData>
  implements FileWebsite<FurbooruFileSubmission>
{
  protected BASE_URL = 'https://furbooru.org';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FurbooruAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(`${this.BASE_URL}`, {
      partition: this.accountId,
    });

    if (res.body.includes('Logout')) {
      const document = parse(res.body);
      const usernameElement = document.querySelector('[data-user-name]');
      const username =
        usernameElement?.getAttribute('data-user-name') || 'Unknown';
      return this.loginState.setLogin(true, username);
    }

    return this.loginState.logout();
  }

  createFileModel(): FurbooruFileSubmission {
    return new FurbooruFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private getRating(rating: SubmissionRating): string {
    switch (rating) {
      case SubmissionRating.MATURE:
        return 'questionable';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 'explicit';
      case SubmissionRating.GENERAL:
      default:
        return 'safe';
    }
  }

  private tagsWithRatingTag(
    tags: string[],
    rating: SubmissionRating,
  ): string[] {
    const ratingTag = this.getRating(rating);
    const knownRatings = [
      'safe',
      'suggestive',
      'questionable',
      'explicit',
      'semi-grimdark',
      'grimdark',
      'grotesque',
    ];

    const lowerCaseTags = tags.map((t) => t.toLowerCase());

    // Add rating tag if not already present
    if (!lowerCaseTags.includes(ratingTag)) {
      let add = true;

      for (const r of knownRatings) {
        if (lowerCaseTags.includes(r)) {
          add = false;
          break;
        }
      }

      if (add) {
        tags.push(ratingTag);
      }
    }
    return tags;
  }

  async onPostFileSubmission(
    postData: PostData<FurbooruFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    try {
      return await this.attemptFilePost(postData, files, cancellationToken);
    } catch (err) {
      // Users have reported it working on a second attempt
      this.logger?.warn(err, 'Furbooru Post Retry');
      return await this.attemptFilePost(postData, files, cancellationToken);
    }
  }

  private async attemptFilePost(
    postData: PostData<FurbooruFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const { options } = postData;
    const tags = this.tagsWithRatingTag([...options.tags], options.rating);

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withData({
        ...(await BrowserWindowUtils.getFormData(
          this.accountId,
          `${this.BASE_URL}/images/new`,
          {
            custom: 'document.body.querySelectorAll("form")[3]',
          },
        )),
      })
      .setField('_method', 'post')
      .addFile('image[image]', files[0])
      .setField('image[tag_input]', tags.join(', ').trim())
      .setField('image[description]', options.description || '')
      .setField('image[source_url]', files[0].metadata.sourceUrls[0] || '');

    const result = await builder.send<string>(`${this.BASE_URL}/images`);
    if (result.statusCode === 200 || result.statusCode === 302) {
      // Look for redirect or success indicators in response
      if (result.body.includes('image/')) {
        const document = parse(result.body);
        const imageLink = document.querySelector('a[href*="/images/"]');
        const imageUrl = imageLink?.getAttribute('href');

        if (imageUrl) {
          const fullUrl = `${this.BASE_URL}${imageUrl}`;
          return PostResponse.fromWebsite(this).withSourceUrl(fullUrl);
        }
      }

      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post submission'));
  }

  onValidateFileSubmission = validatorPassthru;
}
