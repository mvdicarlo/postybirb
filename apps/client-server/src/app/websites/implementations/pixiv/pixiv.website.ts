import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { load } from 'cheerio';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { PixivAccountData } from './models/pixiv-account-data';
import { PixivFileSubmission } from './models/pixiv-file-submission';

@WebsiteMetadata({
  name: 'pixiv',
  displayName: 'Pixiv',
  minimumPostWaitInterval: 60000 * 5, // 5 minutes between posts
})
@UserLoginFlow('https://www.pixiv.net')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.mbToBytes(32), // Image limit is 32MB
  },
})
export default class Pixiv
  extends Website<PixivAccountData>
  implements FileWebsite<PixivFileSubmission>
{
  protected BASE_URL = 'https://www.pixiv.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PixivAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(this.BASE_URL, {
      partition: this.accountId,
    });

    const isLoggedIn = !res.body.includes('signup-form');
    if (isLoggedIn) {
      return this.loginState.setLogin(true, 'Logged In');
    }

    return this.loginState.logout();
  }

  createFileModel(): PixivFileSubmission {
    return new PixivFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<PixivFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    // Get the create page to check for version and get tokens
    const page = await Http.get<string>(
      `${this.BASE_URL}/illustration/create`,
      {
        partition: this.accountId,
      },
    );

    const $ = load(page.body);
    const accountInfo = JSON.parse(
      $('#__NEXT_DATA__').contents().first().text(),
    );
    const { token } = JSON.parse(
      accountInfo.props.pageProps.serverSerializedPreloadedState,
    ).api;

    const { options } = postData;
    const postFiles = files.map((file) => file.toPostFormat());

    const form: Record<string, unknown> = {
      title: options.title.substring(0, 32),
      caption: options.description,
      'tags[]': options.tags.slice(0, 10),
      allowTagEdit: options.communityTags ? 'true' : 'false',
      xRestrict: this.getContentRating(options.rating),
      sexual: options.sexual ? 'true' : 'false',
      aiType: options.aiGenerated ? 'aiGenerated' : 'notAiGenerated',
      restrict: 'public',
      responseAutoAccept: 'false',
      'suggestedtags[]': '',
      original: options.original ? 'true' : 'false',
      'ratings[violent]': 'false',
      'ratings[drug]': 'false',
      'ratings[thoughts]': 'false',
      'ratings[antisocial]': 'false',
      'ratings[religion]': 'false',
      'attributes[yuri]': 'false',
      'attributes[bl]': 'false',
      'attributes[furry]': 'false',
      'attributes[lo]': 'false',
      tweet: 'false',
      allowComment: 'true',
      'titleTranslations[en]': '',
      'captionTranslations[en]': '',
      'files[]': postFiles,
    };

    postFiles.forEach((_, index) => {
      form[`imageOrder[${index}][type]`] = 'newFile';
      form[`imageOrder[${index}][fileKey]`] = `${index}`;
    });

    const sexualType = form.xRestrict;
    if (sexualType !== 'general') {
      delete form.sexual;
      if (options.matureContent) {
        options.matureContent.forEach((c) => {
          form[`attributes[${c}]`] = 'true';
        });
      }
    }

    if (options.containsContent) {
      options.containsContent.forEach((c) => {
        form[`ratings[${c}]`] = 'true';
      });
    }

    cancellationToken.throwIfCancelled();
    try {
      const post = await Http.post<{ error: string }>(
        `${this.BASE_URL}/ajax/work/create/illustration`,
        {
          partition: this.accountId,
          type: 'multipart',
          data: form,
          headers: {
            'x-csrf-token': token,
          },
        },
      );

      if (!post.body.error) {
        return PostResponse.fromWebsite(this);
      }

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(post)
        .withException(
          new Error(
            post.body.error ? JSON.stringify(post.body.error) : 'Unknown error',
          ),
        );
    } catch (error) {
      return PostResponse.fromWebsite(this).withException(
        error instanceof Error ? error : new Error(JSON.stringify(error)),
      );
    }
  }

  private getContentRating(rating: SubmissionRating) {
    switch (rating) {
      case SubmissionRating.ADULT:
      case SubmissionRating.MATURE:
        return 'r18';
      case SubmissionRating.EXTREME:
        return 'r18g';
      case SubmissionRating.GENERAL:
      default:
        return 'general';
    }
  }

  onValidateFileSubmission = validatorPassthru;
}
