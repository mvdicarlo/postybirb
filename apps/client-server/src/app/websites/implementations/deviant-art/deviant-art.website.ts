import { SelectOption, SelectOptionSingle } from '@postybirb/form-builder';
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
import { SelectOptionUtil } from '../../../utils/select-option.util';
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
  displayName: 'DeviantArt',
})
@UserLoginFlow('https://www.deviantart.com/users/login')
@SupportsUsernameShortcut({
  id: 'deviantart',
  url: 'https://deviantart.com/$1',
})
@SupportsFiles({
  acceptedFileSizes: {
    [FileType.VIDEO]: FileSize.megabytes(200),
    [FileType.IMAGE]: FileSize.megabytes(30),
    [FileType.TEXT]: FileSize.megabytes(30),
    [FileType.AUDIO]: FileSize.megabytes(30),
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
      const userInfo = JSON.parse(
        decodeURIComponent(userInfoCookie.value).split(';')[1],
      );
      if (userInfo && userInfo.username) {
        await this.getFolders(userInfo.username);
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

  private async getFolders(username: string) {
    try {
      const csrf = await this.getCSRF();
      const { body } = await Http.get<{ results: DeviantArtFolder[] }>(
        `${
          this.BASE_URL
        }/_puppy/dashared/gallection/folders?offset=0&limit=250&type=gallery&with_all_folder=true&with_permissions=true&username=${encodeURIComponent(
          username,
        )}&da_minor_version=20230710&csrf_token=${csrf}`,
        { partition: this.accountId },
      );

      const { results } = body;
      const folders: SelectOption[] = [];
      const childrenByParentId: Record<string, DeviantArtFolder[]> = {};

      // First pass: group folders by their parent ID
      results.forEach((folder) => {
        const parentKey = folder.parentId || 'null'; // Use 'null' string for root folders
        if (!childrenByParentId[parentKey]) {
          childrenByParentId[parentKey] = [];
        }
        childrenByParentId[parentKey].push(folder);
      });

      // Recursive function to build the tree
      const buildTree = (parentId: string | null): SelectOption[] => {
        const parentKey = parentId || 'null';
        const children = childrenByParentId[parentKey] || [];

        return children.map((folder) => {
          const subChildren = buildTree(folder.folderId);

          if (subChildren.length > 0) {
            // This folder has children, create a group
            return {
              label: folder.name,
              value: folder.folderId,
              items: subChildren,
            };
          }
          // This is a leaf folder
          return {
            label: folder.name,
            value: folder.folderId,
          };
        });
      };

      // Build the tree starting from root folders (parentId = null)
      folders.push(...buildTree(null));

      this.setWebsiteData({
        folders,
      });
    } catch (e) {
      this.logger.withError(e).error('Failed to get folders');
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
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    // File upload step
    const uploadBuilder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('da_minor_version', this.DA_API_VERSION)
      .setField('csrf_token', await this.getCSRF())
      .setField('use_defaults', 'true')
      .setField('folder_name', 'Saved Submissions')
      .addFile('upload_file', files[0]);

    const fileUpload = await uploadBuilder.send<{
      deviationId: number;
      status: string;
      stashId: number;
      privateId: number;
      size: number;
      cursor: string;
      title: string;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/submit/upload/deviation`);

    if (fileUpload.body.status !== 'success') {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(fileUpload.body)
        .withException(new Error('Failed to upload file.'));
    }

    // Determine if submission is mature
    const mature =
      postData.options.isMature ||
      postData.options.rating === SubmissionRating.ADULT ||
      postData.options.rating === SubmissionRating.MATURE ||
      postData.options.rating === SubmissionRating.EXTREME;

    const folders = this.getWebsiteData().folders as SelectOptionSingle[];
    const featured = folders.find((f) => f.label === 'Featured');

    // Prepare update data
    const updateBuilder = new PostBuilder(this, cancellationToken)
      .asJson()
      .withData({
        allow_comments: !postData.options.disableComments,
        allow_free_download: postData.options.allowFreeDownload,
        deviationid: fileUpload.body.deviationId,
        da_minor_version: this.DA_API_VERSION,
        display_resolution: 0,
        editorRaw: DeviantArtDescriptionConverter.convert(
          postData.options.description,
        ),
        editor_v3: '',
        galleryids:
          postData.options.folders.length > 0
            ? postData.options.folders
            : featured
              ? [featured.value]
              : [],
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
      })
      .setConditional('pcp_price_points', postData.options.allowFreeDownload, 0)
      .setConditional('is_mature', mature, true);

    // Update submission details
    const update = await updateBuilder.send<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_napi/shared_api/deviation/update`);

    if (update.body.status !== 'success') {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(update.body)
        .withException(new Error('Failed to upload file.'));
    }

    // Publish the submission
    const publishBuilder = new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('da_minor_version', this.DA_API_VERSION)
      .setField('csrf_token', await this.getCSRF())
      .setField('stashid', update.body.deviationId);
    const publish = await publishBuilder.send<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/publish`);

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
    const validator = this.createValidator<DeviantArtFileSubmission>();
    const { options } = postData;

    // Validate required folder selection
    const selectedFolders = options.folders ?? [];
    const validFolders = this.websiteDataStore.getData().folders ?? [];
    if (selectedFolders.length) {
      const hasMissingFolders = selectedFolders.some(
        (folder) => !SelectOptionUtil.findOptionById(validFolders, folder),
      );

      if (hasMissingFolders) {
        validator.error('validation.folder.missing-or-invalid', {}, 'folders');
      }
    }

    return validator.result;
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

    const builder = new PostBuilder(this, cancellationToken).asJson().withData({
      ...commonFormData,
      editorRaw: DeviantArtDescriptionConverter.convert(
        postData.options.description,
      ),
      title: this.stripInvalidCharacters(postData.options.title),
    });

    const create = await builder.send<{
      deviation: {
        deviationId: number;
        url: string;
      };
    }>(`${this.BASE_URL}/_napi/shared_api/journal/create`);

    if (!create.body.deviation?.deviationId) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: create.body,
          statusCode: create.statusCode,
        })
        .withException(new Error('Failed to create post'));
    }

    const publish = await new PostBuilder(this, cancellationToken)
      .asJson()
      .withData({
        ...commonFormData,
        deviationid: create.body.deviation.deviationId,
        featured: true,
      })
      .send<{
        deviation: {
          deviationId: number;
          url: string;
        };
      }>(`${this.BASE_URL}/_puppy/dashared/journal/publish`);

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

  onValidateMessageSubmission = validatorPassthru;

  private stripInvalidCharacters(title: string) {
    const validRegex = /^[A-Za-z0-9\s_$!?:.,'+\-=~`@#%^*[\]()/{}\\|]$/;
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
