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
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { PhilomenaAccountData } from './models/philomena-account-data';
import { PhilomenaFileSubmission } from './models/philomena-file-submission';

/**
 * Base abstract class for Philomena-based booru websites.
 * Philomena is an open-source imageboard platform used by sites like
 * Derpibooru, Furbooru, and others.
 */
export abstract class PhilomenaWebsite<
  TFileSubmission extends PhilomenaFileSubmission = PhilomenaFileSubmission,
>
  extends Website<PhilomenaAccountData>
  implements FileWebsite<TFileSubmission>
{
  protected abstract BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PhilomenaAccountData> =
    {} as DataPropertyAccessibility<PhilomenaAccountData>;

  /**
   * Check if the user is logged in by looking for the logout link
   * and extracting the username from the data-user-name attribute.
   */
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

    return this.loginState.setLogin(false, null);
  }

  abstract createFileModel(): TFileSubmission;

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
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

  /**
   * Extract form fields from the upload page.
   * Philomena sites use CSRF tokens and other hidden fields.
   */
  protected async getUploadFormFields(): Promise<Record<string, string>> {
    const uploadPage = await Http.get<string>(`${this.BASE_URL}/images/new`, {
      partition: this.accountId,
    });

    const root = parse(uploadPage.body);
    const form = root.querySelector('#content form');
    const inputs = form.querySelectorAll('input, textarea, select');

    return inputs.reduce((acc, input) => {
      const name = input.getAttribute('name');
      if (name) {
        const value = input.getAttribute('value') || input.textContent.trim();
        acc[name] = value;
      }
      return acc;
    }, {});
  }

  /**
   * Post a file submission to a Philomena site.
   */
  async onPostFileSubmission(
    postData: PostData<TFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const fields = await this.getUploadFormFields();
    const { rating, tags, description } = postData.options;
    const tagsWithRating = this.tagsWithRatingTag([...tags], rating);
    const file = files[0];

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withData(fields)
      .setField('_method', 'post')
      .setField('image[tag_input]', tagsWithRating.join(', ').trim())
      .addFile('image[image]', file)
      .setField('image[description]', description || '')
      .setField('image[source_url]', file.metadata.sourceUrls?.[0] || '');

    const result = await builder.send<string>(`${this.BASE_URL}/images`);

    return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
  }

  onValidateFileSubmission = validatorPassthru;
}
