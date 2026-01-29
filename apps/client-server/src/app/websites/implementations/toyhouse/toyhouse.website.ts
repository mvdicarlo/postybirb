import { FormFile, Http, HttpResponse } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostFields,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { HTMLElement, parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { ToyhouseAccountData } from './models/toyhouse-account-data';
import { ToyhouseFileSubmission } from './models/toyhouse-file-submission';

@WebsiteMetadata({
  name: 'toyhouse',
  displayName: 'Toyhouse',
})
@UserLoginFlow('https://toyhou.se/~account/login')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  acceptedFileSizes: {
    '*': FileSize.megabytes(4),
  },
})
export default class Toyhouse
  extends Website<ToyhouseAccountData>
  implements FileWebsite<ToyhouseFileSubmission>
{
  protected BASE_URL = 'https://toyhou.se';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<ToyhouseAccountData> =
    {
      characters: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(
        `${this.BASE_URL}/~characters/manage/folder:all`,
        { partition: this.accountId },
      );

      if (!isLoggedIn(res)) {
        // Not logged in
        return this.loginState.setLogin(false, null);
      }

      const $ = parse(res.body);
      const username = $.querySelector(
        '.navbar .display-user-tiny > span.display-user-username',
      ).text.trim();

      const characters = await this.loadAllCharacters($);

      this.setWebsiteData({ characters });

      return this.loginState.setLogin(true, username);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }

  private async loadAllCharacters(firstPage: HTMLElement) {
    const allCharacters = this.getCharacters(firstPage);

    // Check if there are more pages
    let hasNextPage = !!firstPage.querySelector(
      '.pagination-wrapper a[rel="next"]',
    );
    let pageNumber = 2;

    while (hasNextPage) {
      const url = `${this.BASE_URL}/~characters/manage/folder:all?page=${pageNumber}`;

      const res = await Http.get<string>(url, {
        partition: this.accountId,
      });

      const $ = parse(res.body);
      const pageCharacters = this.getCharacters($);
      allCharacters.push(...pageCharacters);

      // Check if there's a next page
      hasNextPage = !!$.querySelector('.pagination-wrapper a[rel="next"]');
      pageNumber++;
    }

    return allCharacters;
  }

  createFileModel(): ToyhouseFileSubmission {
    return new ToyhouseFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<ToyhouseFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const page = await Http.get<string>(`${this.BASE_URL}/~images/upload`, {
      partition: this.accountId,
    });

    if (!isLoggedIn(page)) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Not logged in'),
      );
    }

    const $ = parse(page.body);
    const token = $.querySelector(
      'head > meta[name="csrf-token"]',
    ).getAttribute('content');

    // This form data is very finnicky on what does and does not work.
    // Having some fields as empty strings is actually required. Be wary about changing anything about this payload.
    const formData = {
      // Tech stuff
      _token: token,
      referer_url: `${this.BASE_URL}/~images/upload`,

      // Image
      image: files[0].toPostFormat(),
      image_zoom: '',
      image_x: '',
      image_y: '',

      // Thumbnail (custom thumbnails are not supported at this time)
      thumbnail: new FormFile(Buffer.alloc(0), {
        filename: '',
        contentType: 'application/octet-stream',
      }),
      thumbnail_options: 'onsite',
      thumbnail_custom: 'offsite',

      // Caption
      caption: postData.options.description,

      // Privacies
      authorized_privacy: postData.options.authorizedViewers || '0',
      public_privacy: postData.options.publicViewers || '0',
      watermark_id: postData.options.watermark || '1',

      // NSFW Settings
      is_sexual: parseIsSexual(postData.options.rating),
      is_nudity: postData.options.nudity ? '1' : undefined,
      is_gore: postData.options.gore ? '1' : undefined,
      is_sensitive:
        postData.options.sensitiveContent || postData.options.contentWarning
          ? '1'
          : undefined,
      warning: postData.options.contentWarning || '',

      // Artist Credits
      ...parseArtistInfo(postData.options),

      // Characters
      'character_ids[]': [...postData.options.characters, ''],
    };

    const result = await Http.post<string>(`${this.BASE_URL}/~images/upload`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200 && !result.body.includes('alert-danger')) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(result.body)
        .withSourceUrl(result.responseUrl);
    }

    const err = parse(result.body)
      .querySelector('.alert-danger')
      .textContent.trim();

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(result.body)
      .withException(new Error(`Failed to post: ${err}`));
  }

  async onValidateFileSubmission(
    postData: PostData<ToyhouseFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<ToyhouseFileSubmission>();

    return validator.result;
  }

  private getCharacters($: HTMLElement) {
    const getCharId = (href: string) => {
      // Extract the rightmost ID from paths like /6669686.name or /6669686.name/6669743.other-name
      const parts = href.split('/').filter(Boolean);
      const match = parts[parts.length - 1]?.match(/^(\d+)\./);
      return match ? match[1] : null;
    };

    return Array.from(
      $.querySelectorAll(
        '.characters-gallery .gallery-thumb .character-name-badge',
      ),
    ).map((e) => ({
      label: e.textContent.trim(),
      value: getCharId(e.getAttribute('href')),
    }));
  }
}

function isLoggedIn(res: HttpResponse<string>) {
  return (
    res.statusCode === 200 &&
    (!res.responseUrl ||
      new URL(res.responseUrl).pathname !== '/~account/login')
  );
}

function parseIsSexual(rating: SubmissionRating) {
  switch (rating) {
    case SubmissionRating.GENERAL:
      return '0'; // No Sexual Content
    case SubmissionRating.MATURE:
      return '1'; // Mild Sexual Content
    case SubmissionRating.ADULT:
    case SubmissionRating.EXTREME:
      return '2'; // Explicit Sexual Content
    default:
      return '0';
  }
}

function parseArtistInfo(submission: PostFields<ToyhouseFileSubmission>) {
  // If offSiteArtistUrl is provided, use Off-Site artist info.
  // We only support one artist for simplicity. Toyhouse expects n+1 artists, so we add an extra.
  if (submission.offSiteArtistUrl) {
    return {
      'artist[]': ['offsite', 'onsite'],
      'artist_username[]': ['', ''],
      'artist_url[]': [submission.offSiteArtistUrl, ''],
      'artist_name[]': [submission.artistName, ''],
      'artist_credit[]': ['', ''],
    };
  }

  // On-Site artist.
  return {
    'artist[]': ['onsite', 'onsite'],
    'artist_username[]': [submission.artistName, ''],
    'artist_url[]': ['', ''],
    'artist_name[]': ['', ''],
    'artist_credit[]': ['', ''],
  };
}
