import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { PiczelAccountData } from './models/piczel-account-data';
import { PiczelFileSubmission } from './models/piczel-file-submission';

@WebsiteMetadata({
  name: 'piczel',
  displayName: 'Piczel',
})
@UserLoginFlow('https://piczel.tv/login')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    '*': FileSize.megabytes(10), // 10MB limit
  },
  fileBatchSize: 20,
})
@SupportsUsernameShortcut({
  id: 'piczel',
  url: 'https://piczel.tv/gallery/$1',
})
export default class Piczel
  extends Website<
    PiczelAccountData,
    {
      preloadedData?: {
        currentUser?: {
          auth?: {
            client: string;
            expiry: string;
            'token-type': string;
            uid: string;
            'access-token': string;
          };
        };
      };
    }
  >
  implements FileWebsite<PiczelFileSubmission>
{
  protected BASE_URL = 'https://piczel.tv';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PiczelAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(`${this.BASE_URL}/gallery/upload`, {
      partition: this.accountId,
    });

    if (res.body.includes('/signup')) {
      return this.loginState.logout();
    }

    try {
      const match = res.body.match(
        /<script type="text\/javascript">window\.__PRELOADED_STATE__ = (.*?)<\/script>/gmi,
      );

      if (!match || !match[1]) {
        return this.loginState.logout();
      }
      const preloadedData = JSON.parse(match[1]);
      const username = preloadedData?.currentUser?.data?.username;

      if (!username) {
        return this.loginState.logout();
      }
      // Store the preloaded data in session data for authentication
      this.sessionData.preloadedData = preloadedData;

      // Fetch folders
      await this.getFolders(username);

      return this.loginState.setLogin(true, username);
    } catch (error) {
      return this.loginState.logout();
    }
  }

  private async getFolders(username: string): Promise<void> {
    try {
      const res = await Http.get<{ id: number; name: string }[]>(
        `${this.BASE_URL}/api/users/${username}/gallery/folders`,
        {
          partition: this.accountId,
        },
      );

      const folders = res.body.map((f) => ({
        value: f.id.toString(),
        label: f.name,
      }));

      const currentData = this.websiteDataStore.getData();
      await this.websiteDataStore.setData({ ...currentData, folders });
    } catch (error) {
      // If folders can't be fetched, store empty array
      const currentData = this.websiteDataStore.getData();
      await this.websiteDataStore.setData({ ...currentData, folders: [] });
    }
  }

  createFileModel(): PiczelFileSubmission {
    return new PiczelFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<PiczelFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const { preloadedData } = this.sessionData;
    if (!preloadedData?.currentUser?.auth) {
      throw new Error('No authentication data found');
    }

    const { auth } = preloadedData.currentUser;
    const { options } = postData;
    const formData: {
      nsfw: boolean;
      description: string;
      title: string;
      tags: string[];
      files: Array<{
        name: string;
        size: number;
        type: string;
        data: string;
      }>;
      uploadMode: string;
      queue: boolean;
      publish_at: string;
      thumbnail_id: string;
      folder_id?: string;
    } = {
      nsfw: options.rating !== SubmissionRating.GENERAL,
      description: options.description || '',
      title: options.title || 'New Submission',
      tags: options.tags,
      files: files.map((file) => ({
        name: file.fileName,
        size: file.buffer.length,
        type: file.mimeType,
        data: `data:${file.mimeType};base64,${file.buffer.toString('base64')}`,
      })),
      uploadMode: 'PUBLISH',
      queue: false,
      publish_at: '',
      thumbnail_id: '0',
    };

    if (options.folder) {
      formData.folder_id = options.folder;
    }

    const headers = {
      Accept: '*/*',
      client: auth.client,
      expiry: auth.expiry,
      'token-type': auth['token-type'],
      uid: auth.uid,
      Authorization: `${auth['token-type']} ${auth['access-token']}`,
      'access-token': auth['access-token'],
    };

    cancellationToken.throwIfCancelled();
    const result = await Http.post<{ id?: string }>(
      `${this.BASE_URL}/api/gallery`,
      {
        partition: this.accountId,
        data: formData,
        type: 'json',
        headers,
      },
    );

    PostResponse.validateBody(this, result);

    if (result.body?.id) {
      return PostResponse.fromWebsite(this).withSourceUrl(
        `${this.BASE_URL}/gallery/image/${result.body.id}`,
      );
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(result.body)
      .withException(new Error('Failed to post submission'));
  }

  onValidateFileSubmission = validatorPassthru;
}
