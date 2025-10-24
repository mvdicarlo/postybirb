import { Http } from '@postybirb/http';
import {
  E621AccountData,
  E621OAuthRoutes,
  E621TagCategory,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { app } from 'electron';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { SubmissionValidator } from '../../commons/validator';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { WithCustomDescriptionParser } from '../../models/website-modifiers/with-custom-description-parser';
import { Website } from '../../website';
import { E621FileSubmission } from './models/e621-file-submission';

@WebsiteMetadata({
  name: 'e621',
  displayName: 'e621',
})
@CustomLoginFlow('e621')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'video/webm'],
  acceptedFileSizes: { '*': FileSize.megabytes(100) },
  acceptsExternalSourceUrls: true,
  fileBatchSize: 1,
})
@SupportsUsernameShortcut({
  id: 'e621',
  url: 'https://e621.net/user/show/$1',

  convert: (websiteName, shortcut) => {
    if (websiteName === 'e621' && shortcut === 'e6') return `@$1`;
    return undefined;
  },
})
@DisableAds()
export default class E621
  extends Website<E621AccountData>
  implements FileWebsite<E621FileSubmission>, OAuthWebsite<E621OAuthRoutes>
{
  protected BASE_URL = 'https://e621.net/';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<E621AccountData> =
    {
      username: true,
      key: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();
    if (data.username) return this.loginState.setLogin(true, data.username);

    return this.loginState.logout();
  }

  onAuthRoute: OAuthRouteHandlers<E621OAuthRoutes> = {
    login: async (data) => {
      // This check is only run at account creation stage because v3 did this. Maybe its worth moving to the onLogin?
      try {
        const response = await Http.get(
          `https://e621.net/posts.json?login=${encodeURIComponent(data.username)}&api_key=${
            data.key
          }&limit=1`,
          { partition: '' },
        );
        if (response.statusCode !== 200) throw new Error('Login failed');
      } catch (e) {
        this.logger.withError(e).error('onAuthRoute.login failed');
        return { result: false };
      }

      await this.setWebsiteData(data);
      const result = await this.onLogin();
      return { result: result.isLoggedIn };
    },
  };

  createFileModel(): E621FileSubmission {
    return new E621FileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private readonly headers = { 'User-Agent': `PostyBirb/${app.getVersion()}` };

  private async request<T>(
    cancellableToken: CancellableToken,
    method: 'get' | 'post',
    url: string,
    form?: Record<string, unknown>,
  ) {
    cancellableToken.throwIfCancelled();

    if (method === 'get') {
      return Http.get<T>(`${this.BASE_URL}${url}`, { partition: '' });
    }

    return Http.post<T>(`${this.BASE_URL}${url}`, {
      partition: '',
      type: 'multipart',
      data: form,
      headers: this.headers,
    });
  }

  async onPostFileSubmission(
    postData: PostData<E621FileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellableToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellableToken.throwIfCancelled();
    const accountData = this.websiteDataStore.getData();
    const file = files[0];

    // Spec: https://e621.net/help/dtext
    const description = postData.options.description
      .replaceAll('\n', '')
      .replace(/\[url=([^\]]*)\]([^[]*)\[\/url\]/, '"$2":[$1]');
    const formData = {
      login: accountData.username,
      api_key: accountData.key,
      'upload[tag_string]': postData.options.tags.join(' ').trim(),
      'upload[file]': file.toPostFormat(),
      'upload[rating]': this.getRating(postData.options.rating),
      'upload[description]': postData.options.description,
      'upload[parent_id]': postData.options.parentId || '',
      'upload[source]': file.metadata.sourceUrls
        .filter((s) => !!s)
        .slice(0, 10)
        .join('%0A'),
      file: files[0].toPostFormat(),
      thumb: files[0].thumbnailToPostFormat(),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await this.request<{
      success: boolean;
      location: string;
      reason: string;
      message: string;
    }>(cancellableToken, 'post', `/uploads.json`, formData);

    if (result.body.success && result.body.location) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(result.body)
        .withSourceUrl(`https://e621.net${result.body.location}`);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(
        new Error(
          `${result.body.reason || ''} || ${result.body.message || ''}`,
        ),
      );
  }

  async onValidateFileSubmission(
    postData: PostData<E621FileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<E621FileSubmission>();

    await this.validateTags(postData, validator);
    await this.validateUserFeedback(validator);

    return validator.result;
  }

  private getRating(rating: SubmissionRating) {
    switch (rating) {
      case SubmissionRating.MATURE:
        return 'q';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 'e';
      case SubmissionRating.GENERAL:
      default:
        return 's';
    }
  }

  private async validateUserFeedback(
    validator: SubmissionValidator<E621FileSubmission>,
  ) {
    try {
      const { username } = this.websiteDataStore.getData();
      const feedbacks = await this.getUserFeedback(username);

      if (Array.isArray(feedbacks)) {
        for (const feedback of feedbacks) {
          if (feedback.category === E621UserFeedbackCategory.Positive) continue;

          const updatedAt = new Date(feedback.updated_at);
          const week =
            /* ms */ 1000 *
            /* sec */ 60 *
            /* min */ 60 *
            /* hour */ 60 *
            /* day */ 24 *
            /* week */ 7;

          if (Date.now() - updatedAt.getTime() > week) continue;

          validator.warning('validation.file.e621.user-feedback.recent', {
            username,
            negativeOrNeutral: feedback.category,
            feedback:
              feedback.body.length > 100
                ? `${feedback.body.slice(0, 100)}...`
                : feedback.body,
          });
        }
      }
    } catch (error) {
      this.logger.error(error);
      validator.warning('validation.file.e621.user-feedback.network-error', {});
    }
  }

  private async validateTags(
    submissionPart: PostData<E621FileSubmission>,
    validator: SubmissionValidator<E621FileSubmission>,
  ) {
    const { tags } = submissionPart.options;

    if (tags.length) {
      try {
        const tagsMeta = await this.getTagMetadata(tags);
        const context: TagCheckingContext = {
          ifYouWantToCreateNotice: true,
          generalTags: 0,
          validator,
        };

        if (Array.isArray(tagsMeta)) {
          // All tags do exists but may be still invalid
          const tagsSet = new Set(tags);

          for (const tagMeta of tagsMeta) {
            tagsSet.delete(tagMeta.name);
            this.validateTag(tagMeta, context);
          }

          // Missing tags are invalid
          for (const tag of tagsSet) this.tagIsInvalid(context, tag);
        } else {
          // No results are produced, all tags are invalid
          for (const tag of tags) this.tagIsInvalid(context, tag);
        }

        if (context.generalTags < 10) {
          validator.warning(
            'validation.file.e621.tags.recommended',
            { generalTags: context.generalTags },
            'tags',
          );
        }
      } catch (error) {
        this.logger.error(error);
        validator.warning(
          'validation.file.e621.tags.network-error',
          {},
          'tags',
        );
      }
    }
  }

  private tagIsInvalid(context: TagCheckingContext, tag: string) {
    context.validator.warning(
      context.ifYouWantToCreateNotice
        ? 'validation.file.e621.tags.missing-create'
        : 'validation.file.e621.tags.missing',
      { tag },
      'tags',
    );
    context.ifYouWantToCreateNotice = false;
  }

  private validateTag(tag: E621Tag, context: TagCheckingContext) {
    if (tag.category === E621TagCategory.Invalid) {
      context.validator.error(
        'validation.file.e621.tags.invalid',
        { tag: tag.name },
        'tags',
      );
    }

    if (tag.post_count < 2) {
      context.validator.error(
        'validation.file.e621.tags.low-use',
        { tag: tag.name, postCount: tag.post_count },
        'tags',
      );
    }

    if (tag.category === E621TagCategory.General) context.generalTags++;
  }

  private async getUserFeedback(username: string) {
    return this.getMetadata<E621UserFeedbacksEmpty | E621UserFeedbacks>(
      `/user_feedbacks.json?search[user_name]=${username}`,
    );
  }

  private async getTagMetadata(formattedTags: string[]) {
    return this.getMetadata<E621TagsEmpty | E621Tags>(
      `/tags.json?search[name]=${formattedTags
        .map((e) => encodeURIComponent(e))
        .join(',')}&limit=320`,
    );
  }

  private metadataCache = new Map<string, object>();

  private async getMetadata<T extends object>(url: string) {
    const cached = this.metadataCache.get(url) as T;
    if (cached) return cached;

    const response = await this.request<object>(
      new CancellableToken(),
      'get',
      url,
    );

    if (response.statusCode !== 200) throw new Error(response.statusMessage);

    const result = response.body;
    this.metadataCache.set(url, result);

    return result;
  }
}

interface TagCheckingContext {
  ifYouWantToCreateNotice: boolean;
  generalTags: number;
  validator: SubmissionValidator<E621FileSubmission>;
}

// Source: https://e621.net/tags.json?search[name]=nonexistenttag
interface E621TagsEmpty {
  tags: [];
}

// Source https://e621.net/tags.json?search[name]=furry
type E621Tags = E621Tag[];

// Source https://e621.net/tags.json?search[name]=furry
interface E621Tag {
  id: number;
  name: string;
  post_count: number;

  // example: 'anthro 2 duo 2 female 2 furry 2 male 2 male/female 2 mammal 2 beach 1 beatrice_doodledox 1 big_butt 1 bikini 1 credits 1 drew 1 hand_on_butt 1 hi_res 1 human 1 humanoid 1 lion 1 signature 1 spicebunny 1 spicebxnny 1 text 1 this 1 two-piece_swimsuit 1 underwear 1'
  related_tags: string;

  // example: '2025-01-20T00:16:49.927+03:00'
  related_tags_updated_at: string;

  category: E621TagCategory;

  // example: false
  is_locked: boolean;

  // example: '2020-03-05T13:49:37.994+03:00'
  created_at: string;

  // example: '2025-01-20T00:16:49.928+03:00'
  updated_at: string;
}

// Source: https://e621.net/user_feedbacks.json
interface E621UserFeedbacksEmpty {
  user_feedbacks: [];
}

// Source: https://e621.net/user_feedbacks.json?search[user_name]=fishys1
type E621UserFeedbacks = E621UserFeedback[];

// Source: https://e621.net/user_feedbacks
enum E621UserFeedbackCategory {
  Neutral = 'neutral',
  Negative = 'negative',
  Positive = 'positive',
}

// Source: https://e621.net/user_feedbacks.json?search[user_name]=fishys1
interface E621UserFeedback {
  id: number;
  user_id: number;
  creator_id: number;
  // example: '2025-01-04T06:55:21.562+03:00'
  created_at: string;
  // example: 'Please do not post advertisements for you YCH auctions.  "[1]":/posts/5263398 "[2]":/posts/5280084\n\n[section=Advertising]\n* Do not promote any external sites, resources, products, or services.\n* If you are an artist or content owner, you are permitted to advertise products and services you may offer. You may do so in the "description" field of your posts, on the artist page, and in your profile description.\n\nIf you wish to promote your products or services through a banner ad, please contact `ads@dragonfru.it` with any questions. See the "advertisement help page":/help/advertising for more information.\n\n"[Code of Conduct - Advertising]":/wiki_pages/e621:rules#advertising\n[/section]\n'
  body: string;
  category: E621UserFeedbackCategory;
  // example: '2025-01-04T06:55:21.562+03:00'
  updated_at: string;
  updater_id: string;
  is_deleted: boolean;
}
