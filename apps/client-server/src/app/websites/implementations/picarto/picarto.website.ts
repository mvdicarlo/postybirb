import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { BrowserWindowUtils } from '@postybirb/utils/electron';
import { mutation, query } from 'gql-query-builder';
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
import { PicartoAccountData } from './models/picarto-account-data';
import { PicartoFileSubmission } from './models/picarto-file-submission';

@WebsiteMetadata({
  name: 'picarto',
  displayName: 'picarto',
})
@UserLoginFlow('https://picarto.tv')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    '*': FileSize.megabytes(15),
  },
  fileBatchSize: 5, // 1 main + up to 4 variations
})
@SupportsUsernameShortcut({ id: 'ptv', url: 'https://picarto.tv/$1' })
export default class Picarto
  extends Website<
    PicartoAccountData,
    { accessToken?: string; channelId?: string; username?: string }
  >
  implements FileWebsite<PicartoFileSubmission>
{
  protected BASE_URL = 'https://picarto.tv';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PicartoAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    // Load the site and read localStorage to find the auth payload
    try {
      const ls = await BrowserWindowUtils.getLocalStorage<{
        auth?: string;
      }>(this.accountId, this.BASE_URL, 3000);

      if (!ls?.auth) {
        return this.loginState.logout();
      }

      const auth = JSON.parse(ls.auth) as {
        access_token: string;
        user: { username: string; id: number; channel: { id: string } };
      };

      this.sessionData.accessToken = auth.access_token;
      this.sessionData.channelId = auth.user.channel.id?.toString();
      this.sessionData.username = auth.user.username;

      // Populate folders
      await this.retrieveAlbums();

      return this.loginState.setLogin(true, auth.user.username);
    } catch (e) {
      this.logger.error('Picarto login check failed', e);
      return this.loginState.logout();
    }
  }

  createFileModel(): PicartoFileSubmission {
    return new PicartoFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    // Max 4K image size for non-member users and <= 15MB
    return {
      width: 2160,
      height: 3840,
      maxBytes: FileSize.megabytes(15),
      allowQualityLoss: true,
    };
  }

  async onPostFileSubmission(
    postData: PostData<PicartoFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const { accessToken, channelId } = this.sessionData;
    if (!accessToken || !channelId) {
      throw new Error('Not authenticated with Picarto');
    }

    // 1) Generate JWT token for file uploads
    const genToken = query({
      operation: 'generateJwtToken',
      variables: {
        channel_id: { value: Number(channelId), type: 'Int' },
        channel_name: { value: null, type: 'String' },
        user_id: { value: null, type: 'Int' },
      },
      fields: ['key', '__typename'],
    });

    const jwtResp = await Http.post<{
      data: { generateJwtToken: { key: string } };
    }>('https://ptvintern.picarto.tv/ptvapi', {
      partition: this.accountId,
      type: 'json',
      data: { query: genToken.query, variables: genToken.variables },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    PostResponse.validateBody(this, jwtResp);
    const jwt = jwtResp.body?.data?.generateJwtToken?.key;
    if (!jwt) {
      throw new Error('Failed to retrieve upload token');
    }

    // 2) Upload primary image
    const primaryUpload = await new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withHeader('Authorization', `Bearer ${jwt}`)
      .addFile('file_name', files[0])
      .setField('channel_id', channelId)
      .send<{
        message: string;
        error?: string;
        data?: { uid: string };
      }>('https://picarto.tv/images/_upload');

    const mainUid = primaryUpload.body?.data?.uid;
    if (!mainUid) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(primaryUpload.body)
        .withException(new Error('Primary image upload failed'));
    }

    // 3) Upload up to 4 variations
    const variationUids: string[] = [];
    const additional = files.slice(1, 5);
    for (const f of additional) {
      const up = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .withHeader('Authorization', `Bearer ${jwt}`)
        .addFile('file_name', f)
        .setField('channel_id', channelId)
        .send<{
          message: string;
          error?: string;
          data?: { uid: string };
        }>('https://picarto.tv/images/_upload');
      const uid = up.body?.data?.uid;
      if (uid) variationUids.push(uid);
    }

    // 4) Finish post via GraphQL createArtwork
    const { options } = postData;

    const rating = this.convertRating(options.rating);
    const tags = (options.tags || [])
      .map((t) => t.trim().replace(/\s+/g, '_'))
      .filter((t) => t.length >= 1)
      .map((t) => (t.length > 30 ? t.slice(0, 30) : t))
      .slice(0, 30);

    const createArtworkGql = mutation({
      operation: 'createArtwork',
      variables: {
        input: {
          value: {
            album_id: options.folder || null,
            category: options.category || 'Creative',
            comment_setting: options.comments || 'EVERYONE',
            description: Buffer.from(options.description || '').toString(
              'base64',
            ),
            download_original: options.downloadSource ?? true,
            main_image: mainUid,
            rating,
            schedule_publishing_date: '',
            schedule_publishing_time: '',
            schedule_publishing_timezone: '',
            software: (options.softwares || []).join(','),
            tags: tags.join(','),
            title: options.title || '',
            variations: variationUids.join(','),
            visibility: options.visibility || 'PUBLIC',
          },
          type: 'CreateArtworkInput',
        },
      },
      fields: ['status', 'message', 'data', '__typename'],
    });

    const finish = await Http.post<{
      errors?: unknown[];
      data?: { createArtwork?: { status: 'error' | 'ok'; message?: string } };
    }>('https://ptvintern.picarto.tv/ptvapi', {
      partition: this.accountId,
      type: 'json',
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        query: createArtworkGql.query,
        variables: createArtworkGql.variables,
      },
    });

    PostResponse.validateBody(this, finish);
    const status = finish.body?.data?.createArtwork?.status;
    if (status === 'error' || finish.body?.errors?.length) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(finish.body)
        .withException(
          new Error(
            finish.body?.data?.createArtwork?.message || 'Picarto post failed',
          ),
        );
    }

    return PostResponse.fromWebsite(this).withAdditionalInfo(finish.body);
  }

  onValidateFileSubmission = validatorPassthru;

  private async retrieveAlbums() {
    if (!this.sessionData.accessToken) return;
    try {
      const albumsQ = query({
        operation: 'albums',
        fields: ['id', 'title'],
      });

      const res = await Http.post<{
        data: { albums: { id: string | null; title: string }[] };
      }>('https://ptvintern.picarto.tv/ptvapi', {
        partition: this.accountId,
        type: 'json',
        headers: { Authorization: `Bearer ${this.sessionData.accessToken}` },
        data: { query: albumsQ.query, variables: albumsQ.variables },
      });

      const albums = res.body?.data?.albums ?? [];
      const folders = albums.map((a) => ({ value: a.id, label: a.title }));
      await this.websiteDataStore.setData({
        ...this.websiteDataStore.getData(),
        folders,
      });
    } catch (e) {
      this.logger.warn('Failed to load Picarto albums', e);
      await this.websiteDataStore.setData({
        ...this.websiteDataStore.getData(),
        folders: [],
      });
    }
  }

  private convertRating(rating: SubmissionRating): 'SFW' | 'ECCHI' | 'NSFW' {
    switch (rating) {
      case SubmissionRating.MATURE:
        return 'ECCHI';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 'NSFW';
      case SubmissionRating.GENERAL:
      default:
        return 'SFW';
    }
  }
}
