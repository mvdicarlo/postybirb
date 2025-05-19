import {
  $Typed,
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyFeedThreadgate,
  AppBskyVideoGetJobStatus,
  AppBskyVideoGetUploadLimits,
  AppBskyVideoUploadVideo,
  AtpAgent,
  AtUri,
  BlobRef,
  ComAtprotoLabelDefs,
  RichText,
} from '@atproto/api';
import { ReplyRef } from '@atproto/api/dist/client/types/app/bsky/feed/post';
import { JobStatus } from '@atproto/api/dist/client/types/app/bsky/video/defs';
import { Http } from '@postybirb/http';
import {
  BlueskyAccountData,
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import FormData from 'form-data';
import fetch, { Headers, Request, RequestInit, Response } from 'node-fetch';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { BlueskyFileSubmission } from './models/bluesky-file-submission';
import { BlueskyMessageSubmission } from './models/bluesky-message-submission';

function getRichTextLength(text: string): number {
  return new RichText({ text }).graphemeLength;
}

@WebsiteMetadata({
  name: 'bluesky',
  displayName: 'Bluesky',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/mov',
    'video/webm',
  ],
  acceptedFileSizes: { '*': 1_000_000 },
  fileBatchSize: 4,
})
export default class Bluesky
  extends Website<BlueskyAccountData>
  implements
    FileWebsite<BlueskyFileSubmission>,
    MessageWebsite<BlueskyMessageSubmission>
{
  protected BASE_URL = 'https://bsky.com/';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<BlueskyAccountData> =
    {
      folders: true,
      username: true,
      password: true,
    };

  private makeAgent(): AtpAgent {
    // HACK: The atproto library makes a half-hearted attempt at supporting Node
    // by letting you specify a fetch handler, but then uses Headers and
    // FormData unconditionally anyway, with no way to change that behavior.
    // Patching them into the global namespace is ugly, but it works.
    globalThis.FormData =
      FormData as unknown as (typeof globalThis)['FormData'];
    globalThis.Headers = Headers as unknown as (typeof globalThis)['Headers'];
    globalThis.Request = Request as unknown as (typeof globalThis)['Request'];
    globalThis.Response =
      Response as unknown as (typeof globalThis)['Response'];

    return new AtpAgent({
      service: 'https://bsky.social',
      fetch: fetch as unknown as Window['fetch'],
    });
  }

  public async onLogin(): Promise<ILoginState> {
    const { username, password } = this.websiteDataStore.getData();

    const agent = this.makeAgent();
    return agent
      .login({
        identifier: username,
        password,
      })
      .then((res) => {
        if (res.success) return this.loginState.logout();

        return this.loginState.setLogin(true, res.data.handle);
      })
      .catch((error) => {
        this.logger.error(error);
        return this.loginState.logout();
      });
  }

  createFileModel(): BlueskyFileSubmission {
    return new BlueskyFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<BlueskyFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const agent = this.makeAgent();
    const { username, password } = this.websiteDataStore.getData();

    await agent.login({ identifier: username, password });

    const profile = await agent.getProfile({ actor: agent.session.did });
    const reply = await this.getReplyRef(agent, postData.options.replyToUrl);

    const embeds = await this.uploadEmbeds(agent, files);

    let labelsRecord: $Typed<ComAtprotoLabelDefs.SelfLabels> | undefined;
    if (postData.options.label_rating) {
      labelsRecord = {
        values: [{ val: postData.options.label_rating }],
        $type: 'com.atproto.label.defs#selfLabels',
      };
    }

    const rt = new RichText({ text: postData.options.description });
    await rt.detectFacets(agent);

    const postResult = await agent.post({
      text: rt.text,
      facets: rt.facets,
      embed: embeds,
      labels: labelsRecord,
      ...(reply ? { reply } : {}),
    });

    if (postResult && postResult.uri) {
      // Generate a friendly URL
      const { handle } = profile.data;
      const server = 'bsky.app'; // Can't use the agent sadly, but this might change later: agent.service.hostname;
      const postId = postResult.uri.slice(postResult.uri.lastIndexOf('/') + 1);

      const friendlyUrl = `https://${server}/profile/${handle}/post/${postId}`;

      // After the post has been made, check to see if we need to set a ThreadGate; these are the options to control who can reply to your post, and need additional calls
      if (postData.options.threadgate) {
        this.createThreadgate(
          agent,
          postResult.uri,
          postData.options.threadgate,
        );
      }

      return PostResponse.fromWebsite(this).withSourceUrl(friendlyUrl);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Unknown error occured'))
      .withAdditionalInfo(postResult);
  }

  async onValidateFileSubmission(
    postData: PostData<BlueskyFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  createMessageModel(): BlueskyMessageSubmission {
    return new BlueskyMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<BlueskyMessageSubmission>,
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
    postData: PostData<BlueskyMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  private async getReplyRef(
    agent: AtpAgent,
    url?: string,
  ): Promise<ReplyRef | null> {
    if (!url?.trim()) return null;

    const postId = this.getPostIdFromUrl(url);
    if (!postId) throw new Error(`Invalid reply to url '${url}'`);

    // cf. https://atproto.com/blog/create-post#replies
    const parent = await agent.getPost(postId);
    const { reply } = parent.value;
    const root = reply ? reply.root : parent;
    return {
      root: { uri: root.uri, cid: root.cid },
      parent: { uri: parent.uri, cid: parent.cid },
    };
  }

  private getPostIdFromUrl(url: string): { repo: string; rkey: string } | null {
    // A regular web link like https://bsky.app/profile/{repo}/post/{id}
    const link = /\/profile\/([^/]+)\/post\/([a-zA-Z0-9.\-_~]+)/.exec(url);
    if (link) return { repo: link[1], rkey: link[2] };

    // Protocol link like at://did:plc:{repo}/app.bsky.feed.post/{id}
    const at =
      /(did:plc:[a-zA-Z0-9.\-_~]+)\/.+\.post\/([a-zA-Z0-9.\-_~]+)/.exec(url);
    if (at) return { repo: at[1], rkey: at[2] };

    return null;
  }

  private countFileTypes(files: PostingFile[]): {
    images: number;
    videos: number;
    other: number;
    gifs: number;
  } {
    const counts = { images: 0, videos: 0, other: 0, gifs: 0 };
    for (const file of files) {
      if (file.fileType === FileType.VIDEO) {
        ++counts.videos;
      } else if (
        file.fileName.endsWith('.gif') ||
        file.mimeType.startsWith('image/gif')
      ) {
        ++counts.gifs;
      } else if (file.fileType === FileType.IMAGE) {
        ++counts.images;
      } else {
        ++counts.other;
      }
    }
    return counts;
  }

  private createThreadgate(
    agent: AtpAgent,
    postUri: string,
    fromPostThreadGate: string,
  ) {
    const allow: (
      | $Typed<AppBskyFeedThreadgate.MentionRule>
      | $Typed<AppBskyFeedThreadgate.FollowingRule>
      | $Typed<AppBskyFeedThreadgate.ListRule>
    )[] = [];

    switch (fromPostThreadGate) {
      case 'mention':
        allow.push({ $type: 'app.bsky.feed.threadgate#mentionRule' });
        break;
      case 'following':
        allow.push({ $type: 'app.bsky.feed.threadgate#followingRule' });
        break;
      case 'mention,following':
        allow.push({ $type: 'app.bsky.feed.threadgate#followingRule' });
        allow.push({ $type: 'app.bsky.feed.threadgate#mentionRule' });
        break;
      default: // Leave the array empty and this sets no one - nobody mode
        break;
    }

    agent.app.bsky.feed.threadgate.create(
      { repo: agent.session.did, rkey: new AtUri(postUri).rkey },
      { post: postUri, createdAt: new Date().toISOString(), allow },
    );
  }

  private async uploadEmbeds(
    agent: AtpAgent,
    files: PostingFile[],
  ): Promise<$Typed<AppBskyEmbedImages.Main> | $Typed<AppBskyEmbedVideo.Main>> {
    // Bluesky supports either images or a video as an embed
    // GIFs must be treated as video on bsky
    const fileCount = this.countFileTypes(files);

    if (fileCount.videos === 0 && fileCount.gifs === 0) {
      const uploadedImages: AppBskyEmbedImages.Image[] = [];
      for (const file of files) {
        const altText = file.metadata.altText || '';
        const ref = await this.uploadImage(agent, file);

        uploadedImages.push({
          image: ref,
          alt: altText,
          aspectRatio: { height: file.height, width: file.width },
        });
      }

      return {
        images: uploadedImages,
        $type: 'app.bsky.embed.images',
      };
    }

    for (const file of files) {
      if (
        file.fileType === FileType.VIDEO ||
        file.fileType === FileType.IMAGE
      ) {
        // Only IMAGE file type left is a GIF
        const altText = file.metadata.altText || '';
        this.checkVideoUploadLimits(agent);
        const ref = await this.uploadVideo(agent, file);
        return {
          video: ref,
          alt: altText,
          $type: 'app.bsky.embed.video',
        };
      }
    }

    throw new Error('No files to upload found');
  }

  private async uploadImage(
    agent: AtpAgent,
    file: PostingFile,
  ): Promise<BlobRef | undefined> {
    const blobUpload = await agent.uploadBlob(file.buffer, {
      encoding: file.mimeType,
    });

    if (blobUpload.success) {
      // response has blob.ref
      return blobUpload.data.blob;
    }

    throw new Error('Failed to upload image');
  }

  // There's video methods in the API, but they are utterly non-functional in
  // many ways: wrong lexicon entries and overeager validation thereof that
  // prevents passing required parameters, picking the wrong host to upload to
  // (must be video.bsky.app, NOT some bsky.network host that'll just 404 at the
  // path) and not doing the proper service authentication dance. So we instead
  // follow what the website does here, which is the way that actually works.
  // We also use the same inconsistent header capitalization as they do.
  private async checkVideoUploadLimits(agent: AtpAgent): Promise<void> {
    const token = await this.getAuthToken(
      agent,
      'did:web:video.bsky.app',
      'app.bsky.video.getUploadLimits',
    );

    const url = 'https://video.bsky.app/xrpc/app.bsky.video.getUploadLimits';
    const req: RequestInit = {
      method: 'GET',
      headers: {
        Accept: '*/*',
        authorization: `Bearer ${token}`,
        'atproto-accept-labelers': 'did:plc:ar7c4by46qjdydhdevvrndac;redact',
      },
    };
    const uploadLimits =
      await this.checkFetchResult<AppBskyVideoGetUploadLimits.OutputSchema>(
        fetch(url, req),
      ).catch((err) => {
        this.logger.error(err);
        throw new Error('Getting video upload limits failed', { cause: err });
      });

    this.logger.debug(`Upload limits: ${JSON.stringify(uploadLimits)}`);
    if (!uploadLimits.canUpload) {
      throw new Error(`Not allowed to upload: ${uploadLimits.message}`);
    }
  }

  private async uploadVideo(
    agent: AtpAgent,
    file: PostingFile,
  ): Promise<BlobRef> {
    const token = await this.getAuthToken(
      agent,
      `did:web:${agent.pdsUrl.hostname}`,
      'com.atproto.repo.uploadBlob',
    );
    const did = encodeURIComponent(agent.did);
    const name = encodeURIComponent(this.generateVideoName());
    const url = `https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=${did}&name=${name}`;
    const req: RequestInit = {
      method: 'POST',
      body: file.buffer,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.mimeType,
      },
    };
    // Uploading an already-processed video returns 409 conflict, but a valid
    // response that contains a job id at top level.
    const videoUpload = await this.checkFetchResult<
      JobStatus | AppBskyVideoUploadVideo.OutputSchema
    >(fetch(url, req), true).catch((err) => {
      this.logger.error(err);
      throw new Error('Checking video processing status failed', {
        cause: err,
      });
    });
    this.logger.debug(`Video upload: ${JSON.stringify(videoUpload)}`);
    return this.waitForVideoProcessing(
      'jobStatus' in videoUpload
        ? videoUpload?.jobStatus?.jobId
        : videoUpload?.jobId,
    );
  }

  private generateVideoName(): string {
    const characters =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let name = '';
    for (let i = 0; i < 12; ++i) {
      name += characters[Math.floor(Math.random() * characters.length)];
    }
    return `${name}.mp4`;
  }

  private async waitForVideoProcessing(jobId: string): Promise<BlobRef> {
    const encodedJobId = encodeURIComponent(jobId);
    const url = `https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${encodedJobId}`;
    let jobStatus: JobStatus;
    do {
      await new Promise((r) => {
        setTimeout(r, 4000);
      });
      this.logger.debug(`Polling video processing status at ${url}`);
      const req: RequestInit = {
        method: 'GET',
        headers: {
          'atproto-accept-labelers': 'did:plc:ar7c4by46qjdydhdevvrndac;redact',
        },
      };
      const res =
        await this.checkFetchResult<AppBskyVideoGetJobStatus.OutputSchema>(
          fetch(url, req),
        ).catch((err) => {
          this.logger.error(err);
          throw new Error('Checking video processing status failed', {
            cause: err,
          });
        });

      this.logger.debug(`Job status: ${JSON.stringify(res)}`);
      jobStatus = res.jobStatus;
    } while (
      jobStatus.state !== 'JOB_STATE_COMPLETED' &&
      jobStatus.state !== 'JOB_STATE_FAILED'
    );

    if (jobStatus.state === 'JOB_STATE_COMPLETED') {
      if (jobStatus.blob) return jobStatus.blob;

      throw new Error('No blob ref after video processing');
    }

    throw new Error(`Video processing failed: ${jobStatus.message}`);
  }

  private async checkFetchResult<T>(
    promise: Promise<Response>,
    allowConflict = false,
  ) {
    const res = await promise;
    if (
      (res.status >= 200 && res.status < 300) ||
      (allowConflict && res.status === 409)
    ) {
      try {
        const body = await res.json();
        return body as T;
      } catch (err) {
        throw new Error(`Failed to get JSON body: ${err}`);
      }
    } else {
      const body = await this.tryGetErrorBody(res);
      throw new Error(
        `Failed with status ${res.status} ${res.statusText}: ${body})}`,
      );
    }
  }

  private async getAuthToken(
    agent: AtpAgent,
    aud: string,
    lxm: string,
  ): Promise<string> {
    this.logger.debug(`Get auth token for ${aud}::${lxm}`);
    const auth = await agent.com.atproto.server
      .getServiceAuth({ aud, lxm })
      .catch((err) => {
        this.logger.error(err);
        throw new Error(`Auth for ${aud}::${lxm} failed`, { cause: err });
      });

    if (!auth.success) {
      throw new Error(`Auth for ${aud}::${lxm} not successful`);
    }

    return auth.data.token;
  }

  private async tryGetErrorBody(res: Response): Promise<string> {
    try {
      const body = await res.text();
      return body;
    } catch (e) {
      return `(error getting body: ${e})`;
    }
  }
}
