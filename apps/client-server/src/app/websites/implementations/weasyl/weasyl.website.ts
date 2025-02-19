import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SimpleValidationResult,
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
import { WeasylAccountData } from './models/weasyl-account-data';
import { WeasylFileSubmission } from './models/weasyl-file-submission';
import { WeasylMessageSubmission } from './models/weasyl-message-submission';

@WebsiteMetadata({
  name: 'weasyl',
  displayName: 'Weasyl',
})
@UserLoginFlow('https://weasyl.com')
@SupportsFiles({
  acceptedMimeTypes: [
    'application/pdf',
    'audio/mp3',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'swf',
    'text/markdown',
    'text/plain',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.mbToBytes(50),
    'application/pdf': FileSize.mbToBytes(10),
    'text/*': FileSize.mbToBytes(2),
    swf: FileSize.mbToBytes(50),
    'audio/mp3': FileSize.mbToBytes(15),
  },
})
@SupportsUsernameShortcut({
  id: 'weasyl',
  url: 'https://weasyl.com/~$1',
})
export default class Weasyl
  extends Website<WeasylAccountData>
  implements
    FileWebsite<WeasylFileSubmission>,
    MessageWebsite<WeasylMessageSubmission>
{
  protected BASE_URL = 'https://weasyl.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<WeasylAccountData> =
    {};

  protected readonly retrievedWebsiteData: {
    folders: SelectOption[];
  } = {
    folders: [],
  };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<{ login: string }>(
      `${this.BASE_URL}/api/whoami`,
      {
        partition: this.accountId,
      },
    );

    if (res.body.login) {
      this.loginState.setLogin(true, res.body.login);
      await this.getFolders(res.body.login);
    } else {
      this.loginState.setLogin(false, null);
    }

    return this.loginState.getState();
  }

  private async getFolders(username: string): Promise<void> {
    const res = await Http.get<{
      folders: {
        title: string;
        folder_id: string;
        subfolders: {
          title: string;
          folder_id: string;
        }[];
      }[];
    }>(`${this.BASE_URL}/api/users/${username}/view`, {
      partition: this.accountId,
    });

    const weasylFolders = res.body.folders ?? [];
    const folders: SelectOption[] = [];
    weasylFolders.forEach((f) => {
      const folder: SelectOption = {
        label: f.title,
        value: f.folder_id,
      };

      folders.push(folder);

      if (f.subfolders) {
        f.subfolders.forEach((sf) => {
          const subfolder: SelectOption = {
            label: `${folder.label} / ${sf.title}`,
            value: sf.folder_id,
          };

          folders.push(subfolder);
        });
      }
    });

    this.retrievedWebsiteData.folders = folders;
  }

  createFileModel(): WeasylFileSubmission {
    return new WeasylFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<WeasylFileSubmission>,
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
    postData: PostData<WeasylFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  createMessageModel(): WeasylMessageSubmission {
    return new WeasylMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<WeasylMessageSubmission>,
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
    postData: PostData<WeasylMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }
}
