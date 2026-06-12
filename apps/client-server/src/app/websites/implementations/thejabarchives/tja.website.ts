import {
  FileWebsite,
  ILoginState,
  IPostResponse,
  ImageResizeProps,
  PostData,
  PostResponse,
  PostingFile,
  SupportsFiles,
  UserLoginFlow,
  WebsiteMetadata,
  validatorPassthru,
  PostBatchData,
  CancellableToken,
  DynamicObject,
  Website,
  DataPropertyAccessibility,
} from '@postybirb/types';
import { TJAAccountData } from './models/tja-account-data';
import { TJAFileSubmission } from './models/tja-file-submission';

@WebsiteMetadata({
  name: 'thejabarchives',
  displayName: 'The Jab Archives',
})
@UserLoginFlow('https://www.jabarchives.com/main/login')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
  ],
  acceptedFileSizes: {
    'image/jpeg': 50 * 1024 * 1024,
    'image/png':  50 * 1024 * 1024,
    'image/gif':  50 * 1024 * 1024,
    'video/mp4':  200 * 1024 * 1024,
    'video/webm': 200 * 1024 * 1024,
  },
  fileBatchSize: 1,
})
export default class TheJabArchives
  extends Website<TJAAccountData>
  implements FileWebsite<TJAFileSubmission>
{
  protected readonly BASE_URL = 'https://www.jabarchives.com/main';

  public readonly externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TJAAccountData> =
    {
      username:    true,
      displayName: true,
      isArtist:    true,
    };

  // ── Login ──────────────────────────────────────────────────────────────────
  // PostyBirb opens the login URL in a webview; once the user logs in the
  // PHP session cookie is captured automatically.  We verify by hitting the
  // userinfo endpoint.
  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await this.httpClient.get<{
        username: string;
        displayName: string;
        isArtist: boolean;
      }>(`${this.BASE_URL}/api/v1/userinfo.php`);

      if (res.body?.username) {
        await this.setWebsiteData({
          username:    res.body.username,
          displayName: res.body.displayName,
          isArtist:    res.body.isArtist,
        });
        return this.loginState.setLogin(true, res.body.username);
      }
    } catch {
      // fall through to logged-out state
    }
    return this.loginState.setLogin(false, null);
  }

  // ── Gallery list (populates the gallery dropdown in the submission form) ───
  public async getGalleries(): Promise<Array<{ value: string; label: string }>> {
    try {
      const res = await this.httpClient.get<{
        galleries: Array<{ id: number; title: string }>;
      }>(`${this.BASE_URL}/api/v1/galleries.php`);

      return (res.body?.galleries ?? []).map((g) => ({
        value: String(g.id),
        label: g.title,
      }));
    } catch {
      return [];
    }
  }

  // ── File submission model ──────────────────────────────────────────────────
  createFileModel(): TJAFileSubmission {
    return new TJAFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined; // TJA handles resizing server-side via Imagick
  }

  // ── Post ───────────────────────────────────────────────────────────────────
  async onPostFileSubmission(
    postData: PostData<TJAFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
    _batch: PostBatchData,
  ): Promise<IPostResponse> {
    const { options } = postData;
    const file = files[0];

    const form = new FormData();
    form.append('file',        file.buffer, {
      filename:    file.fileName,
      contentType: file.mimeType,
    } as any);
    form.append('gallery_id',  options.galleryId ?? '');
    form.append('title',       postData.submission.metadata?.title ?? file.fileName);
    form.append('tags',        (postData.submission.metadata?.tags ?? []).join(', '));
    form.append('description', postData.submission.metadata?.description ?? '');

    const res = await this.httpClient.post<{
      success: boolean;
      id: number;
      url: string;
    }>(
      `${this.BASE_URL}/api/v1/submit.php`,
      form,
      { type: 'multipart' },
    );

    if (!res.body?.success) {
      throw new Error(`TJA submit failed: ${JSON.stringify(res.body)}`);
    }

    return PostResponse.fromWebsite(this)
      .withSourceUrl(`https://www.jabarchives.com${res.body.url}`)
      .build();
  }

  onValidateFileSubmission = validatorPassthru;
}
