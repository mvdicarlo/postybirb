import {
  ImageResizeProps,
  ISubmissionFile,
  LoginResult,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { validatorPassthru } from '../../commons/validator-passthru';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import {
  PhilomenaAccountData,
  PhilomenaOAuthRoutes,
} from './models/philomena-account-data';
import { PhilomenaFileSubmission } from './models/philomena-file-submission';

type PhilomenaImageResponse = {
  image?: {
    id?: number;
  };
  errors?: Record<string, string | string[]>;
};

/**
 * Base abstract class for Philomena-based booru websites.
 * Philomena is an open-source imageboard platform used by sites like
 * Derpibooru, Furbooru, and others.
 */
export abstract class PhilomenaWebsite<
  TFileSubmission extends PhilomenaFileSubmission = PhilomenaFileSubmission,
>
  extends Website<PhilomenaAccountData>
  implements FileWebsite<TFileSubmission>, OAuthWebsite<PhilomenaOAuthRoutes>
{
  protected abstract BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PhilomenaAccountData> =
    {
      username: true,
      key: false,
    };

  public async onLogin(): Promise<LoginResult> {
    const { username, key } = this.websiteDataStore.getData();
    if (!username?.trim() || !key?.trim()) {
      return { loggedIn: false };
    }

    if (await this.checkApiKey(key)) {
      return { loggedIn: true, username };
    }

    return { loggedIn: false };
  }

  public onAuthRoute: OAuthRouteHandlers<PhilomenaOAuthRoutes> = {
    login: async (data) => {
      const username = data.username?.trim();
      const key = data.key?.trim();
      if (!username || !key || !(await this.checkApiKey(key))) {
        return { result: false };
      }

      await this.setWebsiteData({ username, key });
      const state = await this.login();
      return { result: state.isLoggedIn };
    },
  };

  private async checkApiKey(key: string): Promise<boolean> {
    const response = await this.platform.http.get(
      `${this.BASE_URL}/api/v1/json/filters/user?key=${encodeURIComponent(
        key,
      )}&per_page=1`,
      { partition: '' },
    );

    if (response.statusCode === 200) {
      return true;
    }
    if (response.statusCode === 401 || response.statusCode === 403) {
      return false;
    }

    throw new Error(
      `Unable to validate the Philomena API key: HTTP ${response.statusCode}`,
    );
  }

  abstract createFileModel(): TFileSubmission;

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  /**
   * Map PostyBirb ratings to Philomena rating tags.
   */
  protected getRating(rating: SubmissionRating): string {
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

  /**
   * Get the list of known rating tags for Philomena sites.
   * Can be overridden by subclasses if they have different rating tags.
   */
  protected getKnownRatings(): string[] {
    return [
      'safe',
      'suggestive',
      'questionable',
      'explicit',
      'semi-grimdark',
      'grimdark',
      'grotesque',
    ];
  }

  /**
   * Ensure tags include a rating tag if one isn't already present.
   */
  protected tagsWithRatingTag(
    tags: string[],
    rating: SubmissionRating,
  ): string[] {
    const ratingTag = this.getRating(rating);
    const knownRatings = this.getKnownRatings();
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

    return tags;
  }

  private getApiError(
    body: PhilomenaImageResponse | string,
    statusCode: number,
  ): string {
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    if (typeof body !== 'string' && body.errors) {
      const errors = Object.entries(body.errors).flatMap(([field, messages]) =>
        (Array.isArray(messages) ? messages : [messages]).map(
          (message) => `${field.replaceAll('_', ' ')} ${message}`,
        ),
      );
      if (errors.length) {
        return errors.join('; ');
      }
    }

    if (statusCode === 401) {
      return 'Philomena rejected the API key. Update the account credentials and try again.';
    }
    if (statusCode === 403) {
      return 'This account is not allowed to post through the Philomena API.';
    }
    if (statusCode >= 200 && statusCode < 300) {
      return 'Philomena did not return the created image ID.';
    }

    return `Philomena image upload failed with HTTP ${statusCode}.`;
  }

  async onPostFileSubmission(
    postData: PostData<TFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const { rating, tags, description } = postData.options;
    const tagsWithRating = this.tagsWithRatingTag([...tags], rating);
    const file = files[0];
    const { key } = this.websiteDataStore.getData();
    if (!key?.trim()) {
      return PostResponse.fromWebsite(this).withException(
        new Error(
          'A Philomena API key is required. Update the account credentials and try again.',
        ),
      );
    }
    const sources = (file.metadata?.sourceUrls ?? [])
      .filter(Boolean)
      .slice(0, 15);
    const sourceFields = Object.fromEntries(
      sources.map((source, index) => [
        `image[sources][${index}][source]`,
        source,
      ]),
    );

    const result = await this.platform.http.post<
      PhilomenaImageResponse | string
    >(`${this.BASE_URL}/api/v1/json/images`, {
      partition: '',
      type: 'multipart',
      data: {
        key: key.trim(),
        'image[anonymous]': 'false',
        'image[tag_input]': tagsWithRating.join(', ').trim(),
        'image[image]': file.toPostFormat(),
        'image[description]': description || '',
        ...sourceFields,
      },
    });

    const response = PostResponse.fromWebsite(this).withAdditionalInfo({
      body: result.body,
      statusCode: result.statusCode,
    });
    const imageId =
      typeof result.body === 'string' ? undefined : result.body.image?.id;

    if (
      result.statusCode >= 200 &&
      result.statusCode < 300 &&
      typeof imageId === 'number'
    ) {
      return response.withSourceUrl(`${this.BASE_URL}/images/${imageId}`);
    }

    return response.withException(
      new Error(this.getApiError(result.body, result.statusCode)),
    );
  }

  onValidateFileSubmission = validatorPassthru;
}
