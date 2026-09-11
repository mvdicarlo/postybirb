import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
    DefaultSubmissionFileMetadata,
    DiscordAccountData,
    PostData,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import Discord from './discord.website';
import { DiscordFileSubmission } from './models/discord-file-submission';
import { DiscordMessageSubmission } from './models/discord-message-submission';

describe('Discord submission options', () => {
  it.each([DiscordMessageSubmission, DiscordFileSubmission])(
    'derives layout-specific limits for %p',
    (SubmissionModel) => {
      const options = new SubmissionModel();
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        4096,
      );
      expect(options.getFormFieldFor('title').maxLength).toBe(256);
      expect(options.getFormFieldFor('title').required).toBe(false);
      expect(options.getFormFieldFor('description').required).toBe(false);

      options.useEmbed = false;
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        2000,
      );
      expect(options.getFormFieldFor('title').maxLength).toBeUndefined();

      options.useEmbed = true;
      options.useTitle = false;
      expect(options.getFormFieldFor('title').maxLength).toBeUndefined();
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        4096,
      );
    },
  );
});

describe('Discord posting', () => {
  let website: Discord;
  let accountData: DiscordAccountData;
  let httpPost: jest.Mock;
  let postData: PostData<DiscordFileSubmission>;
  let file: PostingFile;

  const token = { throwIfAborted: jest.fn() } as unknown as CancellationToken;
  const firstBatch = { index: 0, totalBatches: 1 };

  beforeEach(() => {
    accountData = {
      webhook: 'https://discord.com/api/webhooks/123/test-token',
      serverLevel: 0,
      isForum: false,
    };
    httpPost = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: { id: '300', channel_id: '200', guild_id: '100' },
    });
    website = new Discord(
      new Account({ id: 'discord-account', website: 'discord' }),
      { http: { post: httpPost } } as unknown as PlatformService,
    );
    jest
      .spyOn(website['websiteDataStore'], 'getData')
      .mockImplementation(() => accountData);
    jest.spyOn(website['logger'], 'error').mockImplementation(() => undefined);
    postData = {
      options: {
        ...new DiscordFileSubmission(),
        title: 'Artwork',
        description: 'Description',
        tags: [],
      },
    } as unknown as PostData<DiscordFileSubmission>;
    file = new PostingFile('image', {
      id: 'image',
      submissionFileId: 'image',
      size: 5,
      createdAt: '2026-09-11T00:00:00Z',
      updatedAt: '2026-09-11T00:00:00Z',
      fileName: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('image'),
      width: 1,
      height: 1,
    }).withMetadata({
      ...DefaultSubmissionFileMetadata(),
      altText: 'Alt text',
    });
  });

  afterEach(() => jest.restoreAllMocks());

  function sentPayload() {
    const request = httpPost.mock.calls[0][1];
    return request.type === 'multipart'
      ? JSON.parse(request.data.payload_json)
      : request.data;
  }

  it.each([
    'Contact artist@example.com or name@everyone.com',
    'artist\\_@everyone.com and \\_@here.com',
    '\u00e9@everyone.com',
    '`@everyone` and ``<@123> with a ` inside``',
    '```text\n@everyone and ` <@123>\n```',
    '```\n@everyone in an unfinished code block',
    '~~~\n@here\n~~~',
    '\\@everyone and \\<@123>',
    'https://example.com/@everyone',
    '@everyoneElse and @hereafter',
  ])('does not extract mentions from %s', async (description) => {
    postData.options.description = description;
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().embeds[0].description).toBe(description);
  });

  it('preserves and deduplicates explicit mentions, including legacy users', async () => {
    postData.options.description =
      '<@123> <@!456> <@&789> @everyone @here <@123> @everyone';
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().content).toBe(
      '<@123> <@!456> <@&789> @everyone @here',
    );
  });

  it.each([false, true])(
    'accepts attachment-only posts with useEmbed=%s',
    async (useEmbed) => {
      Object.assign(postData.options, {
        title: '',
        description: '',
        useTitle: true,
        useEmbed,
      });
      await website.onPostFileSubmission(postData, [file], token, firstBatch);
      expect(sentPayload()).toMatchObject({
        embeds: [],
        attachments: [
          { id: 0, filename: 'image.png', description: 'Alt text' },
        ],
      });
      expect(sentPayload().content).toBeUndefined();
    },
  );

  it('accepts title-only embedded messages', async () => {
    postData.options.description = '';
    expect(
      (await website.onValidateMessageSubmission(postData)).errors,
    ).toEqual([]);
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().embeds).toEqual([{ title: 'Artwork' }]);
  });

  it.each([false, true])(
    'rejects empty messages with useEmbed=%s',
    async (useEmbed) => {
      Object.assign(postData.options, {
        title: ' ',
        description: ' ',
        useEmbed,
      });
      expect(
        (await website.onValidateMessageSubmission(postData)).errors,
      ).toEqual([
        {
          id: 'validation.description.required',
          values: {},
          field: 'description',
        },
      ]);
      expect(() => website.onPostMessageSubmission(postData, token)).toThrow(
        'No content to post',
      );
      expect(httpPost).not.toHaveBeenCalled();
    },
  );

  it('preserves file spoilers and alt text', async () => {
    postData.options.isSpoiler = true;
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().attachments).toEqual([
      { id: 0, filename: 'SPOILER_image.png', description: 'Alt text' },
    ]);
    expect(file.fileName).toBe('image.png');
  });

  it.each([
    [false, 2000],
    [true, 4096],
  ])(
    'validates the description boundary with useEmbed=%s',
    async (useEmbed, maxLength) => {
      Object.assign(postData.options, {
        useEmbed,
        description: 'a'.repeat(Number(maxLength)),
      });
      expect(
        (await website.onValidateMessageSubmission(postData)).errors,
      ).toEqual([]);
      expect((await website.onValidateFileSubmission(postData)).errors).toEqual(
        [],
      );
      postData.options.description += 'a';
      expect(
        (await website.onValidateMessageSubmission(postData)).errors,
      ).toContainEqual({
        id: 'validation.description.max-length',
        field: 'description',
        values: { currentLength: Number(maxLength) + 1, maxLength },
      });
      expect(
        (await website.onValidateFileSubmission(postData)).errors,
      ).toHaveLength(1);
    },
  );

  it('validates embed and forum title limits', async () => {
    postData.options.title = 'a'.repeat(256);
    expect(
      (await website.onValidateMessageSubmission(postData)).errors,
    ).toEqual([]);
    postData.options.title += 'a';
    expect(
      (await website.onValidateMessageSubmission(postData)).errors[0].values,
    ).toEqual({
      currentLength: 257,
      maxLength: 256,
    });
    accountData.isForum = true;
    postData.options.title = 'a'.repeat(100);
    expect((await website.onValidateFileSubmission(postData)).errors).toEqual(
      [],
    );
    postData.options.title += 'a';
    expect(
      (await website.onValidateFileSubmission(postData)).errors[0].values,
    ).toEqual({
      currentLength: 101,
      maxLength: 100,
    });
  });

  it('rejects extracted mention content longer than Discord allows', async () => {
    postData.options.description = Array.from(
      { length: 110 },
      (_, index) => `<@${100000000000000000n + BigInt(index)}>`,
    ).join(' ');
    expect(
      (await website.onValidateMessageSubmission(postData)).errors,
    ).toContainEqual({
      id: 'validation.description.max-length',
      field: 'description',
      values: {
        currentLength: postData.options.description.length,
        maxLength: 2000,
      },
    });
  });

  it.each(['message', 'file'])(
    'confirms %s sends and records the message URL',
    async (kind) => {
      accountData.webhook += '?wait=false&thread_id=200&with_components=true';
      const result =
        kind === 'message'
          ? await website.onPostMessageSubmission(postData, token)
          : await website.onPostFileSubmission(
              postData,
              [file],
              token,
              firstBatch,
            );
      const requestUrl = new URL(httpPost.mock.calls[0][0]);
      expect(requestUrl.searchParams.get('wait')).toBe('true');
      expect(requestUrl.searchParams.get('thread_id')).toBe('200');
      expect(requestUrl.searchParams.get('with_components')).toBe('true');
      expect(result.sourceUrl).toBe('https://discord.com/channels/100/200/300');
      expect(result.exception).toBeUndefined();
    },
  );

  it('uses a channel link when the REST response omits the guild ID', async () => {
    httpPost.mockResolvedValue({
      statusCode: 200,
      body: { id: '300', channel_id: '200' },
    });
    const result = await website.onPostMessageSubmission(postData, token);
    expect(result.sourceUrl).toBe('https://discord.com/channels/@me/200/300');
  });

  it('creates a forum thread once and routes continuation using its persisted URL', async () => {
    accountData.isForum = true;
    const result = await website.onPostFileSubmission(postData, [file], token, {
      index: 0,
      totalBatches: 2,
    });
    expect(sentPayload().thread_name).toBe('Artwork');
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.has('thread_id'),
    ).toBe(false);
    httpPost.mockClear();
    await website.onPostFileSubmission(postData, [file], token, {
      index: 1,
      totalBatches: 2,
      sourceUrls: [
        { url: result.sourceUrl!, timestamp: '2026-09-11T00:00:00Z' },
      ],
    });
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.get('thread_id'),
    ).toBe('200');
    expect(sentPayload().thread_name).toBeUndefined();
    expect(sentPayload().embeds).toBeUndefined();
    expect(sentPayload().attachments).toHaveLength(1);
  });

  it('resumes a forum post from persisted URLs without in-memory thread state', async () => {
    accountData.isForum = true;
    await website.onPostFileSubmission(postData, [file], token, {
      index: 2,
      totalBatches: 3,
      sourceUrls: [
        { url: 'invalid', timestamp: '' },
        { url: 'https://example.com/channels/100/999/300', timestamp: '' },
        { url: 'https://discord.com/channels/@me/200/300', timestamp: '' },
      ],
    });
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.get('thread_id'),
    ).toBe('200');
    expect(sentPayload().thread_name).toBeUndefined();
  });

  it('fails before sending a forum continuation when the thread ID is unknown', () => {
    accountData.isForum = true;
    expect(() =>
      website.onPostFileSubmission(postData, [file], token, {
        index: 1,
        totalBatches: 2,
      }),
    ).toThrow('Cannot continue Discord forum post without its thread ID');
    expect(httpPost).not.toHaveBeenCalled();
  });

  it.each(['message', 'file'])(
    'preserves a configured thread for %s posts',
    async (kind) => {
      accountData.isForum = true;
      accountData.webhook += '?thread_id=555';
      postData.options.title = 'a'.repeat(101);
      expect(
        (await website.onValidateMessageSubmission(postData)).errors,
      ).toEqual([]);
      if (kind === 'message') {
        await website.onPostMessageSubmission(postData, token);
      } else {
        await website.onPostFileSubmission(postData, [file], token, {
          index: 1,
          totalBatches: 2,
        });
      }
      expect(
        new URL(httpPost.mock.calls[0][0]).searchParams.get('thread_id'),
      ).toBe('555');
      expect(sentPayload().thread_name).toBeUndefined();
    },
  );

  it('allows an attachment-only forum starter with a fallback thread name', async () => {
    accountData.isForum = true;
    Object.assign(postData.options, {
      title: '',
      description: '',
      useTitle: false,
    });
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().thread_name).toBe('PostyBirb Post');
    expect(sentPayload().embeds).toEqual([]);
  });

  it.each([
    { statusCode: 204 },
    { statusCode: 200, body: {} },
    { statusCode: 200, body: { id: '300' } },
    { statusCode: 200, body: { id: 'invalid', channel_id: '200' } },
  ])(
    'does not treat an unconfirmed response as success: %j',
    async (response) => {
      httpPost.mockResolvedValue(response);
      const result = await website.onPostMessageSubmission(postData, token);
      expect(result.exception?.message).toContain('Discord did not confirm');
      expect(result.sourceUrl).toBeUndefined();
      expect(httpPost).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves Discord error details', async () => {
    httpPost.mockResolvedValue({
      statusCode: 400,
      body: { message: 'Invalid Form Body', code: 50035 },
    });
    const result = await website.onPostMessageSubmission(postData, token);
    expect(result.exception?.message).toContain('Invalid Form Body');
    expect(result.sourceUrl).toBeUndefined();
  });
});
