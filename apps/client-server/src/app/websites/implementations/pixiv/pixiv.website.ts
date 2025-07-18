import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import parse from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
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
    [FileType.IMAGE]: FileSize.megabytes(32), // Image limit is 32MB
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

    const $ = parse(page.body);
    const accountInfo = JSON.parse(
      $.querySelector('#__NEXT_DATA__').textContent,
    );
    const { token } = JSON.parse(
      accountInfo.props.pageProps.serverSerializedPreloadedState,
    ).api;

    const { options } = postData;
    const postFiles = files.map((file) => file.toPostFormat());

    const contentRating = this.getContentRating(options.rating);
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('title', options.title.substring(0, 32))
      .setField('caption', options.description)
      .setField('tags[]', options.tags.slice(0, 10))
      .setField('allowTagEdit', options.communityTags)
      .setField('xRestrict', contentRating)
      .setField('sexual', options.sexual)
      .setConditional(
        'aiType',
        options.aiGenerated,
        'aiGenerated',
        'notAiGenerated',
      )
      .setField('restrict', 'public')
      .setField('responseAutoAccept', 'false')
      .setField('suggestedtags[]', '')
      .setField('original', options.original)
      .setField('ratings[violent]', 'false')
      .setField('ratings[drug]', 'false')
      .setField('ratings[thoughts]', 'false')
      .setField('ratings[antisocial]', 'false')
      .setField('ratings[religion]', 'false')
      .setField('attributes[yuri]', 'false')
      .setField('attributes[bl]', 'false')
      .setField('attributes[furry]', 'false')
      .setField('attributes[lo]', 'false')
      .setField('tweet', 'false')
      .setField('allowComment', 'true')
      .setField('titleTranslations[en]', '')
      .setField('captionTranslations[en]', '')
      .addFiles('files[]', files)
      .forEach(postFiles, (_, index, b) => {
        b.setField(`imageOrder[${index}][type]`, 'newFile');
        b.setField(`imageOrder[${index}][fileKey]`, `${index}`);
      })
      .forEach(options.containsContent, (content, _, b) => {
        b.setField(`ratings[${content}]`, 'true');
      })
      .whenTrue(contentRating !== 'general', (b) => {
        b.removeField('sexual');
        b.forEach(options.matureContent, (c) => {
          b.setField(`attributes[${c}]`, 'true');
        });
      });

    try {
      const post = await builder.withHeader('x-csrf-token', token).send<{
        error: string;
      }>(`${this.BASE_URL}/ajax/work/create/illustration`);

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
