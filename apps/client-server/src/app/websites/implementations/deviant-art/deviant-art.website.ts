import { SelectOptionSingle } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
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
    'gif',
  ],
})
export default class DeviantArt
  extends Website<DeviantArtAccountData>
  implements
    FileWebsite<DeviantArtFileSubmission>,
    MessageWebsite<DeviantArtMessageSubmission>
{
  protected BASE_URL = 'https://www.deviantart.com';

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

  private async getCSRF() {
    const url = await Http.get<string>(this.BASE_URL, {
      partition: this.accountId,
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
    const formData = {
      file: files[0].toPostFormat(),
      thumb: files[0].thumbnailToPostFormat(),
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
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
    const formData = {
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateMessageSubmission(
    postData: PostData<DeviantArtMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }
}
