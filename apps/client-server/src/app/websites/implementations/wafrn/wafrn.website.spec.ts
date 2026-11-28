import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
  DefaultSubmissionFileMetadata,
  MegalodonAccountData,
  PostData,
  SubmissionRating,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { MegalodonApiService } from '../megalodon/megalodon-api-service';
import { MegalodonFileSubmission } from '../megalodon/models/megalodon-file-submission';
import { MegalodonMessageSubmission } from '../megalodon/models/megalodon-message-submission';
import Wafrn from './wafrn.website';

describe('Wafrn', () => {
  let website: Wafrn;
  let accountData: MegalodonAccountData;
  let postStatus: jest.Mock;
  let uploadMedia: jest.Mock;

  const token = { throwIfAborted: jest.fn() } as unknown as CancellationToken;

  beforeEach(() => {
    accountData = {
      instanceUrl: 'app.wafrn.net',
      accessToken: 'token',
      username: 'artist',
    } as MegalodonAccountData;
    postStatus = jest.fn().mockResolvedValue({
      status: 200,
      data: {
        uri: 'https://app.wafrn.net/fediverse/post/1',
        url: 'https://app.wafrn.net/fediverse/post/1',
      },
    });
    uploadMedia = jest.fn().mockResolvedValue({
      status: 200,
      data: { id: 'media-1', type: 'image' },
    });
    jest.spyOn(MegalodonApiService, 'createClient').mockReturnValue({
      postStatus,
      uploadMedia,
    } as never);
    website = new Wafrn(
      new Account({ id: 'wafrn-account', website: 'wafrn' }),
      { http: {} } as unknown as PlatformService,
    );
    jest
      .spyOn(website['websiteDataStore'], 'getData')
      .mockImplementation(() => accountData);
  });

  afterEach(() => jest.restoreAllMocks());

  function createFile(id: string) {
    return new PostingFile(id, {
      id,
      submissionFileId: id,
      size: 5,
      createdAt: '2026-11-28T00:00:00Z',
      updatedAt: '2026-11-28T00:00:00Z',
      fileName: `${id}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from('image'),
      width: 1,
      height: 1,
    }).withMetadata(DefaultSubmissionFileMetadata());
  }

  function postData<T extends MegalodonFileSubmission>(
    overrides: Partial<MegalodonFileSubmission> = {},
  ): PostData<T> {
    return {
      options: {
        ...new MegalodonFileSubmission(),
        description: 'My art\n\n#furry #blue_fox',
        rating: SubmissionRating.GENERAL,
        visibility: 'public',
        ...overrides,
      },
    } as unknown as PostData<T>;
  }

  it('registers the app as a Mastodon client without detection', async () => {
    await expect(website['getInstanceType']()).resolves.toBe('mastodon');
  });

  describe('status text', () => {
    it.each([
      ['#furry #art', '\\#furry #art'],
      ['Title\n#furry', 'Title\n\\#furry'],
      ['  #indented', '  \\#indented'],
      ['text #inline', 'text #inline'],
      ['# Heading', '# Heading'],
      ['## Heading', '## Heading'],
      ['\\#already', '\\#already'],
    ])('formats %j as %j', (input, expected) => {
      expect(website['formatStatusText'](input)).toBe(expected);
    });
  });

  describe('content warning', () => {
    it('keeps the content warning that was set', () => {
      expect(website['getSpoilerText']('Spoilers', true)).toBe('Spoilers');
    });

    it('adds one to sensitive posts', () => {
      expect(website['getSpoilerText'](undefined, true)).toBe('NSFW');
      expect(website['getSpoilerText']('  ', true)).toBe('NSFW');
    });

    it('adds none to safe posts', () => {
      expect(website['getSpoilerText'](undefined, false)).toBeUndefined();
    });
  });

  it('posts files with escaped tags and a content warning', async () => {
    const response = await website.onPostFileSubmission(
      postData({ rating: SubmissionRating.ADULT }),
      [createFile('a'), createFile('b')],
      token,
    );

    expect(response.exception).toBeUndefined();
    expect(response.sourceUrl).toBe('https://app.wafrn.net/fediverse/post/1');
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    expect(postStatus).toHaveBeenCalledWith(
      'My art\n\n\\#furry #blue_fox',
      expect.objectContaining({
        media_ids: ['media-1', 'media-1'],
        sensitive: true,
        spoiler_text: 'NSFW',
        visibility: 'public',
      }),
    );
  });

  it('posts messages with escaped tags', async () => {
    const response = await website.onPostMessageSubmission(
      postData<MegalodonMessageSubmission>(),
      token,
    );

    expect(response.exception).toBeUndefined();
    expect(postStatus).toHaveBeenCalledWith(
      'My art\n\n\\#furry #blue_fox',
      expect.objectContaining({ sensitive: false, spoiler_text: undefined }),
    );
  });

  it('accepts a queued post answered with an empty body', async () => {
    postStatus.mockResolvedValue({ status: 202, data: '' });

    const response = await website.onPostMessageSubmission(
      postData<MegalodonMessageSubmission>(),
      token,
    );

    expect(response.exception).toBeUndefined();
    expect(response.additionalInfo).toEqual({
      message: 'Post accepted by the instance',
      status: 202,
    });
  });
});
