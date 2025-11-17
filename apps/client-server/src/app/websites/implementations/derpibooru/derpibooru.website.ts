import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
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
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { DerpibooruAccountData } from './models/derpibooru-account-data';
import { DerpibooruFileSubmission } from './models/derpibooru-file-submission';

@WebsiteMetadata({
  name: 'derpibooru',
  displayName: 'Derpibooru',
})
@UserLoginFlow('https://derpibooru.org')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/gif',
    'video/webm',
  ],
  acceptedFileSizes: {
    maxBytes: FileSize.megabytes(100),
  },
  fileBatchSize: 1,
  acceptsExternalSourceUrls: true,
})
@SupportsUsernameShortcut({
  id: 'derpibooru',
  url: 'https://derpibooru.org/profiles/$1',
})
export default class Derpibooru
  extends Website<DerpibooruAccountData>
  implements FileWebsite<DerpibooruFileSubmission>
{
  protected BASE_URL = 'https://derpibooru.org';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<DerpibooruAccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(`${this.BASE_URL}`, {
      partition: this.accountId,
    });
    if (res.body.includes('Logout')) {
      return this.loginState.setLogin(
        true,
        res.body.match(/data-user-name="(.*?)"/)[1],
      );
    }
    return this.loginState.setLogin(false, null);
  }

  createFileModel(): DerpibooruFileSubmission {
    return new DerpibooruFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private getRating(rating: SubmissionRating) {
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

  async onPostFileSubmission(
    postData: PostData<DerpibooruFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const uploadPage = await Http.get<string>(`${this.BASE_URL}/images/new`, {
      partition: this.accountId,
    });

    const root = parse(uploadPage.body);
    const form = root.querySelector('#content form');
    const inputs = form.querySelectorAll('input, textarea, select');

    const fields = inputs.reduce((acc, input) => {
      const name = input.getAttribute('name');
      if (name) {
        const value = input.getAttribute('value') || input.textContent.trim();
        acc[name] = value;
      }
      return acc;
    }, {});

    const { rating, tags, description } = postData.options;
    const ratingTag: string = this.getRating(rating);
    const knownRatings: string[] = [
      'safe',
      'suggestive',
      'questionable',
      'explicit',
      'semi-grimdark',
      'grimdark',
      'grotesque',
    ];
    const lowerCaseTags = tags.map((t) => t.toLowerCase());
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

    const file = files[0];
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withData(fields)
      .setField('_method', 'post')
      .setField('image[tag_input]', tags.join(', ').trim())
      .addFile('image[image]', file)
      .setField('image[description]', description || '')
      .setField('image[source_url]', file.metadata.sourceUrls?.[0] || '');

    const result = await builder.send<string>(`${this.BASE_URL}/images`);

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  onValidateFileSubmission = validatorPassthru;
}
