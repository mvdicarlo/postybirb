import { SelectOptionSingle } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { DeviantArtDescriptionConverter } from './deviant-art-description-converter';
import { DeviantArtAccountData } from './models/deviant-art-account-data';
import { DeviantArtFileSubmission } from './models/deviant-art-file-submission';
import { DeviantArtMessageSubmission } from './models/deviant-art-message-submission';

interface DeviantArtFolder {
  description: string;
  folderId: string;
  hasSubfolders: boolean;
  name: string;
  parentId: string | null;
  gallectionUuid: string;
}

@WebsiteMetadata({
  name: 'deviant-art',
  displayName: 'deviant-art',
})
@UserLoginFlow('https://www.deviantart.com/users/login')
@SupportsUsernameShortcut({
  id: 'deviantart',
  url: 'https://deviantart.com/$1',
})
@SupportsFiles({
  acceptedFileSizes: {
    [FileType.VIDEO]: FileSize.mbToBytes(200),
    [FileType.IMAGE]: FileSize.mbToBytes(30),
    [FileType.TEXT]: FileSize.mbToBytes(30),
    [FileType.AUDIO]: FileSize.mbToBytes(30),
  },
  acceptedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'video/x-flv',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/x-shockwave-flash',
    'image/tiff',
    'image/gif',
  ],
})
export default class DeviantArt
  extends Website<DeviantArtAccountData>
  implements
    FileWebsite<DeviantArtFileSubmission>,
    MessageWebsite<DeviantArtMessageSubmission>
{
  protected BASE_URL = 'https://www.deviantart.com';

  private readonly DA_API_VERSION: number = 20230710;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<DeviantArtAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(this.BASE_URL, {
      partition: this.accountId,
    });
    const cookies = await Http.getWebsiteCookies(this.accountId, this.BASE_URL);
    const userInfoCookie = cookies.find((c) => c.name === 'userinfo');
    if (userInfoCookie) {
      const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.value));
      await this.getFolders();
      if (userInfo && userInfo.username) {
        return this.loginState.setLogin(true, userInfo.username);
      }
    }

    return this.loginState.setLogin(false, null);
  }

  private async getCSRF(accountId = this.accountId) {
    const url = await Http.get<string>(this.BASE_URL, {
      partition: accountId,
    });
    return url.body.match(/window.__CSRF_TOKEN__ = '(.*)'/)?.[1];
  }

  private async getFolders() {
    try {
      const csrf = await this.getCSRF();
      const res = await Http.get<{ results: DeviantArtFolder[] }>(
        `${
          this.BASE_URL
        }/_puppy/dashared/gallection/folders?offset=0&limit=250&type=gallery&with_all_folder=true&with_permissions=true&username=${encodeURIComponent(
          this.loginState.username,
        )}&da_minor_version=20230710&csrf_token=${csrf}`,
        { partition: this.accountId },
      );
      const folders: SelectOptionSingle[] = [];
      res.body.results.forEach((f: DeviantArtFolder) => {
        const { parentId } = f;
        let label = f.name;
        if (parentId) {
          const parent = folders.find((r) => r.value === parentId);
          if (parent) {
            label = `${parent.label} / ${label}`;
          }
        }
        folders.push({ value: f.folderId, label });
      });
      this.setWebsiteData({
        folders,
      });
    } catch (e) {
      this.logger.error('Failed to get folders', e);
    }
  }

  createFileModel(): DeviantArtFileSubmission {
    return new DeviantArtFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<DeviantArtFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    // File upload step
    const fileUpload = await Http.post<{
      deviationId: number;
      status: string;
      stashId: number;
      privateId: number;
      size: number;
      cursor: string;
      title: string;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/submit/upload/deviation`, {
      partition: this.accountId,
      type: 'multipart',
      data: {
        upload_file: files[0].toPostFormat(),
        use_defaults: 'true',
        folder_name: 'Saved Submissions',
        da_minor_version: this.DA_API_VERSION,
        csrf_token: await this.getCSRF(),
      },
    });

    if (fileUpload.body.status !== 'success') {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(fileUpload.body)
        .withException(new Error('Failed to upload file.'));
    }

    cancellationToken.throwIfCancelled();

    // Determine if submission is mature
    const mature =
      postData.options.isMature ||
      postData.options.rating === SubmissionRating.ADULT ||
      postData.options.rating === SubmissionRating.MATURE ||
      postData.options.rating === SubmissionRating.EXTREME;

    // Prepare update data
    const updateBody: Record<string, unknown> = {
      allow_comments: !postData.options.disableComments,
      allow_free_download: postData.options.allowFreeDownload,
      deviationid: fileUpload.body.deviationId,
      da_minor_version: this.DA_API_VERSION,
      display_resolution: 0,
      editorRaw: DeviantArtDescriptionConverter.convert(
        postData.options.description,
      ),
      editor_v3: '',
      galleryids: postData.options.folders,
      is_ai_generated: postData.options.isAIGenerated ?? false,
      is_scrap: postData.options.scraps,
      license_options: {
        creative_commons: postData.options.isCreativeCommons ?? false,
        commercial: postData.options.isCommercialUse ?? false,
        modify: postData.options.allowModifications || 'no',
      },
      location_tag: null,
      noai: postData.options.noAI ?? true,
      subject_tag_types: '_empty',
      subject_tags: '_empty',
      tags: postData.options.tags,
      tierids: '_empty',
      title: this.stripInvalidCharacters(postData.options.title),
      csrf_token: await this.getCSRF(),
    };

    if (postData.options.allowFreeDownload) {
      updateBody.pcp_price_points = 0;
    }

    if (mature) {
      updateBody.is_mature = true;
    }

    // Set default folder if none specified
    if (postData.options.folders.length === 0) {
      const folders = this.getWebsiteData().folders as SelectOptionSingle[];
      const featured = folders.find((f) => f.label === 'Featured');
      if (featured) {
        updateBody.galleryids = [`${featured.value}`];
      }
    }

    // Update submission details
    const update = await Http.post<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_napi/shared_api/deviation/update`, {
      partition: this.accountId,
      type: 'json',
      data: updateBody,
    });

    cancellationToken.throwIfCancelled();

    if (update.body.status !== 'success') {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(update.body)
        .withException(new Error('Failed to upload file.'));
    }

    // Publish the submission
    const publish = await Http.post<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/publish`, {
      partition: this.accountId,
      type: 'json',
      data: {
        stashid: update.body.deviationId,
        da_minor_version: this.DA_API_VERSION,
        csrf_token: await this.getCSRF(),
      },
    });

    if (publish.body.status !== 'success') {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(publish.body)
        .withException(new Error('Failed to upload file.'));
    }

    return PostResponse.fromWebsite(this).withSourceUrl(publish.body.url);
  }

  async onValidateFileSubmission(
    postData: PostData<DeviantArtFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  createMessageModel(): DeviantArtMessageSubmission {
    return new DeviantArtMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<DeviantArtMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const commonFormData = {
      csrf_token: await this.getCSRF(),
      da_minor_version: this.DA_API_VERSION,
    };

    const form: Record<string, unknown> = {
      ...commonFormData,
      editorRaw: DeviantArtDescriptionConverter.convert(
        postData.options.description,
      ),
      title: this.stripInvalidCharacters(postData.options.title),
    };

    const create = await Http.post<{
      deviation: {
        deviationId: number;
        url: string;
      };
    }>(`${this.BASE_URL}/_napi/shared_api/journal/create`, {
      partition: this.accountId,
      type: 'json',
      data: form,
    });

    if (!create.body.deviation?.deviationId) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: create.body,
          statusCode: create.statusCode,
        })
        .withException(new Error('Failed to create post'));
    }

    const publish = await Http.post<{
      deviation: {
        deviationId: number;
        url: string;
      };
    }>(`${this.BASE_URL}/_puppy/dashared/journal/publish`, {
      partition: this.accountId,
      type: 'json',
      data: {
        ...commonFormData,
        deviationid: create.body.deviation.deviationId,
        featured: true,
      },
    });

    if (!publish.body.deviation?.deviationId) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: publish.body,
          statusCode: publish.statusCode,
        })
        .withException(new Error('Failed to publish post'));
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: publish.body,
        statusCode: publish.statusCode,
      })
      .withSourceUrl(publish.body.deviation.url);
  }

  async onValidateMessageSubmission(
    postData: PostData<DeviantArtMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  private stripInvalidCharacters(title: string) {
    const validRegex = /^[A-Za-z0-9\s_$!?:.,'+\-=~`@#%^*[\]()/{}\\|]*$/g;
    if (!title) return '';
    let sanitized = '';
    for (let i = 0; i < title.length; i++) {
      const char = title[i];
      if (validRegex.test(char)) {
        sanitized += char;
      }
    }
    return sanitized;
  }
}
