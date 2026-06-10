import {
  ILoginState,
  ImageResizeProps,
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
  extends Website<PiczelAccountData>
  implements FileWebsite<PiczelFileSubmission>
{
  protected BASE_URL = 'https://piczel.tv';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PiczelAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await this.platform.http.get<string>(
      `${this.BASE_URL}/gallery/upload`,
      {
        partition: this.accountId,
      },
    );

    if (res.body.includes('/signup')) {
      return this.loginState.logout();
    }

    try {
      const $ = parse(res.body);
      const jsonMatches =
        $.getElementById('_R_')?.textContent.match(
          /JSON\.parse\(\s*(["'])((?:\\.|(?!\1).)*)\1\s*\)/gm,
        ) ?? [];
      const stateJson =
        jsonMatches.find((match) => match.includes('username')) ?? '';
      const preloadedData = JSON.parse(
        stateJson
          .match(/JSON\.parse\(\s*(["'])((?:\\.|(?!\1).)*)\1\s*\)/)?.[2]
          .replace(/\\/g, '') ?? '',
      );

      if (!preloadedData.currentUser) {
        return this.loginState.logout();
      }
      const { username } = preloadedData.currentUser.data;
      if (!username) {
        return this.loginState.logout();
      }

      // Fetch folders
      await this.getFolders(username);

      return this.loginState.setLogin(true, username);
    } catch (error) {
      return this.loginState.logout();
    }
  }

  private async getFolders(username: string): Promise<void> {
    try {
      const res = await this.platform.http.get<{ id: number; name: string }[]>(
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
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const { options } = postData;
    const builder = new PostBuilder(this, cancellationToken)
      .asJson()
      .setField('nsfw', options.rating !== SubmissionRating.GENERAL)
      .setField('description', options.description || '')
      .setField('title', options.title || 'New Submission')
      .setField('tags', options.tags)
      .setField('uploadMode', 'PUBLISH')
      .setField('queue', false)
      .setField('publish_at', '')
      .setField('thumbnail_id', '0')
      .setField(
        'files',
        files.map((file) => ({
          name: file.fileName,
          size: file.buffer.length,
          type: file.mimeType,
          data: `data:${file.mimeType};base64,${file.buffer.toString('base64')}`,
        })),
      )
      .setConditional('folder_id', !!options.folder, options.folder)
      .withHeaders({
        Accept: '*/*',
      });

    const result = await builder.send<{ id?: string }>(
      `${this.BASE_URL}/api/gallery`,
    );

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
