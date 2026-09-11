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
  it('always offers gallery controls on file submissions', () => {
    const options = new DiscordFileSubmission();
    expect(options.galleryArrangement).toBe('grouped');
    expect(options.getFormFields().galleryArrangement).toMatchObject({
      defaultValue: 'grouped',
      options: [
        { label: 'Grouped', value: 'grouped' },
        { label: 'Stacked', value: 'stacked' },
        { label: 'Cover + gallery', value: 'cover' },
      ],
    });
    expect(options.getFormFields().galleryArrangement.showWhen).toBeUndefined();
    expect(options.getFormFields().mediaPosition.showWhen).toBeUndefined();
    expect(new DiscordMessageSubmission().getFormFields()).not.toHaveProperty(
      'galleryArrangement',
    );
  });

  it.each([DiscordMessageSubmission, DiscordFileSubmission])(
    'uses component fields without legacy layout switches for %p',
    (SubmissionModel) => {
      const options = new SubmissionModel();
      Object.assign(options, { useComponentsV2: false, useEmbed: false });
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        4000,
      );
      expect(options.getFormFieldFor('title').maxLength).toBeUndefined();
      expect(options.getFormFieldFor('title').required).toBe(false);
      expect(options.getFormFieldFor('description').required).toBe(false);
      expect(options.getFormFields()).not.toHaveProperty('useEmbed');
      expect(options.getFormFields()).not.toHaveProperty('useComponentsV2');
      expect(options.getFormFields().useTitle.hidden).not.toBe(true);
    },
  );

  it.each([DiscordMessageSubmission, DiscordFileSubmission])(
    'derives the remaining component text budget for %p',
    (SubmissionModel) => {
      const options = new SubmissionModel();
      options.title = 'Artwork';
      expect(options.getFormFieldFor('title').maxLength).toBeUndefined();
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        3990,
      );
      expect(options.getFormFieldFor('description').expectsInlineTitle).toBe(false);
      expect(options.getFormFields().useTitle.hidden).not.toBe(true);
      options.title = '*Artwork*';
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        3986,
      );
      options.useTitle = false;
      expect(options.getFormFieldFor('description').maxDescriptionLength).toBe(
        4000,
      );
      expect(options.getFormFieldFor('description').expectsInlineTitle).toBe(true);
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
    file = createFile('image', 'png', 'image/png');
  });

  afterEach(() => jest.restoreAllMocks());

  function createFile(id: string, extension: string, mimeType: string) {
    return new PostingFile(id, {
      id,
      submissionFileId: id,
      size: 5,
      createdAt: '2026-09-11T00:00:00Z',
      updatedAt: '2026-09-11T00:00:00Z',
      fileName: `${id}.${extension}`,
      mimeType,
      buffer: Buffer.from('image'),
      width: 1,
      height: 1,
    }).withMetadata({
      ...DefaultSubmissionFileMetadata(),
      altText: 'Alt text',
    });
  }

  function sentPayload() {
    const request = httpPost.mock.calls[0][1];
    return request.type === 'multipart'
      ? JSON.parse(request.data.payload_json)
      : request.data;
  }

  it.each([undefined, false, true])('uses Components V2 regardless of saved legacy flags (%s)', async (savedValue) => {
    Object.assign(postData.options, {
      useComponentsV2: savedValue,
      useEmbed: savedValue,
    });
    accountData.webhook += '?wait=false&with_components=false';
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload()).toEqual({
      flags: 32768,
      allowed_mentions: { parse: ['everyone', 'users', 'roles'] },
      components: [
        {
          type: 17,
          components: [
            { type: 10, content: '## Artwork' },
            { type: 10, content: 'Description' },
          ],
        },
      ],
    });
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.get('with_components'),
    ).toBe('true');
    expect(new URL(httpPost.mock.calls[0][0]).searchParams.get('wait')).toBe('true');
    httpPost.mockClear();
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().flags).toBe(32768);
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().embeds).toBeUndefined();
    expect(sentPayload().components[0].components[1].items[0].media.url).toBe(
      'attachment://image.png',
    );
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.get('with_components'),
    ).toBe('true');
  });

  it('places a V2 gallery between the title and description', async () => {
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload()).toEqual({
      flags: 32768,
      allowed_mentions: { parse: ['everyone', 'users', 'roles'] },
      components: [
        {
          type: 17,
          components: [
            { type: 10, content: '## Artwork' },
            {
              type: 12,
              items: [
                {
                  media: { url: 'attachment://image.png' },
                  description: 'Alt text',
                  spoiler: false,
                },
              ],
            },
            { type: 10, content: 'Description' },
          ],
        },
      ],
      attachments: [{ id: 0, filename: 'image.png', description: 'Alt text' }],
    });
    expect(
      new URL(httpPost.mock.calls[0][0]).searchParams.get('with_components'),
    ).toBe('true');
  });

  it('can place the V2 description above its gallery', async () => {
    postData.options.mediaPosition = 'below';
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().components[0].components.map((component: { type: number }) => component.type)).toEqual([
      10, 10, 12,
    ]);
  });

  it.each([
    ['grouped', [10]],
    ['stacked', Array(10).fill(1)],
    ['cover', [1, 9]],
    [undefined, [10]],
    [null, [10]],
  ] as const)('arranges V2 galleries using %s', async (galleryArrangement, sizes) => {
    Object.assign(postData.options, {
      isSpoiler: true,
      galleryArrangement,
    });
    const files = Array.from({ length: 10 }, (_, index) =>
      createFile(`image-${index}`, 'png', 'image/png'),
    );
    await website.onPostFileSubmission(postData, files, token, firstBatch);
    const components = sentPayload().components[0].components;
    expect(components[0]).toEqual({ type: 10, content: '## Artwork' });
    expect(components.at(-1)).toEqual({ type: 10, content: 'Description' });
    const galleries = components.slice(1, -1);
    expect(galleries.map((gallery: { type: number }) => gallery.type)).toEqual(
      sizes.map(() => 12),
    );
    expect(galleries.map((gallery: { items: unknown[] }) => gallery.items.length)).toEqual(sizes);
    expect(galleries.flatMap((gallery: { items: unknown[] }) => gallery.items)).toEqual(
      files.map((postedFile) => ({
        media: { url: `attachment://SPOILER_${postedFile.fileName}` },
        description: 'Alt text',
        spoiler: true,
      })),
    );
    expect(sentPayload().attachments).toHaveLength(10);
  });

  it.each(['stacked', 'cover'] as const)(
    'preserves download order and description placement with %s galleries',
    async (galleryArrangement) => {
      Object.assign(postData.options, {
        mediaPosition: 'below',
        galleryArrangement,
      });
      const files = [
        createFile('document', 'pdf', 'application/pdf'),
        file,
        createFile('animation', 'gif', 'image/gif'),
        createFile('clip', 'mp4', 'video/mp4'),
        createFile('notes', 'txt', 'text/plain'),
        createFile('detail', 'png', 'image/png'),
        createFile('last', 'png', 'image/png'),
      ];
      await website.onPostFileSubmission(postData, files, token, firstBatch);
      const components = sentPayload().components[0].components;
      expect(components.slice(0, 2)).toEqual([
        { type: 10, content: '## Artwork' },
        { type: 10, content: 'Description' },
      ]);
      const arrangement = components.slice(2).map(
        (component: {
          file?: { url: string };
          items?: { media: { url: string } }[];
        }) => component.items?.map((item) => item.media.url) ?? component.file?.url,
      );
      expect(arrangement).toEqual([
        'attachment://document.pdf',
        ['attachment://image.png'],
        ...(galleryArrangement === 'cover'
          ? [['attachment://animation.gif', 'attachment://clip.mp4']]
          : [['attachment://animation.gif'], ['attachment://clip.mp4']]),
        'attachment://notes.txt',
        ...(galleryArrangement === 'cover'
          ? [['attachment://detail.png', 'attachment://last.png']]
          : [['attachment://detail.png'], ['attachment://last.png']]),
      ]);
    },
  );

  it('validates the combined V2 text budget including heading markup', async () => {
    postData.options.description = 'a'.repeat(3990);
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    expect((await website.onValidateFileSubmission(postData)).errors).toEqual([]);
    postData.options.description += 'a';
    expect((await website.onValidateMessageSubmission(postData)).errors).toContainEqual({
      id: 'validation.description.max-length',
      field: 'description',
      values: { currentLength: 4001, maxLength: 4000 },
    });
    expect((await website.onValidateFileSubmission(postData)).errors).toHaveLength(1);
    expect(() => website.onPostMessageSubmission(postData, token)).toThrow(
      'Discord component text exceeds 4000 characters',
    );
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('keeps intentional V2 mentions in place without the embed mention limit', async () => {
    postData.options.description = Array.from(
      { length: 110 },
      (_, index) => `<@${100000000000000000n + BigInt(index)}>`,
    ).join(' ');
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().components[0].components[1].content).toBe(
      postData.options.description,
    );
  });

  it('preserves mixed file order and uses downloads for non-gallery formats', async () => {
    const files = [
      file,
      createFile('animation', 'gif', 'image/gif'),
      createFile('notes', 'txt', 'text/plain'),
      createFile('clip', 'mp4', 'video/mp4'),
      createFile('audio', 'mp3', 'audio/mpeg'),
      createFile('vector', 'svg', 'image/svg+xml'),
    ];
    await website.onPostFileSubmission(postData, files, token, firstBatch);
    const components = sentPayload().components[0].components;
    expect(components).toEqual([
      { type: 10, content: '## Artwork' },
      {
        type: 12,
        items: ['image.png', 'animation.gif'].map((filename) => ({
          media: { url: `attachment://${filename}` },
          description: 'Alt text',
          spoiler: false,
        })),
      },
      { type: 13, file: { url: 'attachment://notes.txt' }, spoiler: false },
      {
        type: 12,
        items: [
          {
            media: { url: 'attachment://clip.mp4' },
            description: 'Alt text',
            spoiler: false,
          },
        ],
      },
      { type: 13, file: { url: 'attachment://audio.mp3' }, spoiler: false },
      { type: 13, file: { url: 'attachment://vector.svg' }, spoiler: false },
      { type: 10, content: 'Description' },
    ]);
    files.forEach((postedFile, index) => {
      expect(httpPost.mock.calls[0][1].data[`files[${index}]`].fileName).toBe(
        postedFile.fileName,
      );
      expect(sentPayload().attachments[index]).toMatchObject({
        id: index,
        filename: postedFile.fileName,
      });
    });
  });

  it('applies V2 spoilers to media and downloads without changing source files', async () => {
    postData.options.isSpoiler = true;
    const document = createFile('document', 'pdf', 'application/pdf');
    await website.onPostFileSubmission(postData, [file, document], token, firstBatch);
    const components = sentPayload().components[0].components;
    expect(components[1].items[0]).toEqual({
      media: { url: 'attachment://SPOILER_image.png' },
      description: 'Alt text',
      spoiler: true,
    });
    expect(components[2]).toEqual({
      type: 13,
      file: { url: 'attachment://SPOILER_document.pdf' },
      spoiler: true,
    });
    expect(sentPayload().attachments.map((attachment: { filename: string }) => attachment.filename)).toEqual([
      'SPOILER_image.png', 'SPOILER_document.pdf',
    ]);
    expect(file.fileName).toBe('image.png');
    expect(document.fileName).toBe('document.pdf');
  });

  it('supports ten V2 gallery items and rejects an oversized batch before upload', async () => {
    const files = Array.from({ length: 10 }, (_, index) =>
      createFile(`image-${index}`, 'png', 'image/png'),
    );
    await website.onPostFileSubmission(postData, files, token, firstBatch);
    expect(sentPayload().components[0].components[1].items).toHaveLength(10);
    httpPost.mockClear();
    expect(() =>
      website.onPostFileSubmission(postData, [...files, file], token, firstBatch),
    ).toThrow('Discord supports up to 10 attachments per message');
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('preserves V2 alt text at its limit and rejects overflow without truncation', async () => {
    file.metadata.altText = 'a'.repeat(1024);
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().components[0].components[1].items[0].description).toHaveLength(1024);
    httpPost.mockClear();
    file.metadata.altText += 'a';
    expect(() =>
      website.onPostFileSubmission(postData, [file], token, firstBatch),
    ).toThrow('Discord attachment alt text exceeds 1024 characters');
    expect(file.metadata.altText).toHaveLength(1025);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('escapes V2 title formatting and mentions and keeps it on one line', async () => {
    postData.options.title = '  A *title* [link](https://example.com) <@123> @everyone\nNew  line  ';
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().components[0].components[0].content).toBe(
      '## A \\*title\\* \\[link\\](https://example.com) \\<\\@123\\> \\@everyone New line',
    );
  });

  it('accepts title-only messages without legacy title limits', async () => {
    Object.assign(postData.options, {
      title: 'a'.repeat(300),
      description: '',
    });
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().components[0].components).toEqual([
      { type: 10, content: `## ${'a'.repeat(300)}` },
    ]);
  });

  it('allows 4000 V2 description characters when the separate title is disabled', async () => {
    Object.assign(postData.options, {
      useTitle: false,
      description: 'a'.repeat(4000),
    });
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().components[0].components).toEqual([
      { type: 10, content: postData.options.description },
    ]);
  });

  it('allows an attachment-only V2 forum starter and rejects an empty message', async () => {
    accountData.isForum = true;
    Object.assign(postData.options, {
      title: '',
      description: ' ',
    });
    expect((await website.onValidateFileSubmission(postData)).errors).toEqual([]);
    await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(sentPayload().components[0].components).toHaveLength(1);
    expect(sentPayload().components[0].components[0].type).toBe(12);
    expect(sentPayload().thread_name).toBe('PostyBirb Post');
    httpPost.mockClear();
    expect((await website.onValidateMessageSubmission(postData)).errors).toContainEqual({
      id: 'validation.description.required', values: {}, field: 'description',
    });
    expect(() => website.onPostMessageSubmission(postData, token)).toThrow('No content to post');
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('routes V2 forum continuations with media but no repeated title or description', async () => {
    accountData.isForum = true;
    const result = await website.onPostFileSubmission(postData, [file], token, {
      index: 0, totalBatches: 2,
    });
    expect(sentPayload().thread_name).toBe('Artwork');
    httpPost.mockClear();
    await website.onPostFileSubmission(postData, [file], token, {
      index: 1,
      totalBatches: 2,
      sourceUrls: [{ url: result.sourceUrl!, timestamp: '2026-09-11T00:00:00Z' }],
    });
    const url = new URL(httpPost.mock.calls[0][0]);
    expect(url.searchParams.get('thread_id')).toBe('200');
    expect(url.searchParams.get('wait')).toBe('true');
    expect(url.searchParams.get('with_components')).toBe('true');
    expect(sentPayload().flags).toBe(32768);
    expect(sentPayload().thread_name).toBeUndefined();
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().embeds).toBeUndefined();
    expect(sentPayload().components[0].components).toHaveLength(1);
    expect(sentPayload().components[0].components[0].type).toBe(12);
  });

  it('retains forum name limits in V2 but not when posting to a configured thread', async () => {
    accountData.isForum = true;
    postData.options.title = 'a'.repeat(100);
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    postData.options.title += 'a';
    expect((await website.onValidateMessageSubmission(postData)).errors).toContainEqual({
      id: 'validation.title.max-length', field: 'title', values: { currentLength: 101, maxLength: 100 },
    });
    accountData.webhook += '?thread_id=555';
    postData.options.title = 'a'.repeat(300);
    expect((await website.onValidateMessageSubmission(postData)).errors).toEqual([]);
    await website.onPostMessageSubmission(postData, token);
    expect(new URL(httpPost.mock.calls[0][0]).searchParams.get('thread_id')).toBe('555');
    expect(sentPayload().thread_name).toBeUndefined();
  });

  it('preserves a V2 rejection without falling back and risking a duplicate upload', async () => {
    httpPost.mockResolvedValue({
      statusCode: 400,
      body: { message: 'Invalid Form Body', code: 50035 },
    });
    const result = await website.onPostFileSubmission(postData, [file], token, firstBatch);
    expect(result.exception?.message).toContain('Invalid Form Body');
    expect(result.sourceUrl).toBeUndefined();
    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(sentPayload().flags).toBe(32768);
  });

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
  ])('preserves description text without generating separate mentions: %s', async (description) => {
    postData.options.description = description;
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().components[0].components[1].content).toBe(description);
  });

  it('preserves explicit mentions in the description without extraction or deduplication', async () => {
    postData.options.description =
      '<@123> <@!456> <@&789> @everyone @here <@123> @everyone';
    await website.onPostMessageSubmission(postData, token);
    expect(sentPayload().content).toBeUndefined();
    expect(sentPayload().components[0].components[1].content).toBe(
      postData.options.description,
    );
  });

  it('accepts attachment-only posts', async () => {
      Object.assign(postData.options, {
        title: '',
        description: '',
        useTitle: true,
      });
      await website.onPostFileSubmission(postData, [file], token, firstBatch);
      expect(sentPayload()).toMatchObject({
        flags: 32768,
        attachments: [
          { id: 0, filename: 'image.png', description: 'Alt text' },
        ],
      });
      expect(sentPayload().content).toBeUndefined();
      expect(sentPayload().embeds).toBeUndefined();
      expect(sentPayload().components[0].components).toHaveLength(1);
      expect(sentPayload().components[0].components[0].type).toBe(12);
  });

  it.each([false, true])(
    'rejects messages without a description or visible title with useTitle=%s',
    async (useTitle) => {
      Object.assign(postData.options, {
        title: useTitle ? ' ' : 'Artwork',
        description: ' ',
        useTitle,
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
    expect(sentPayload().embeds).toBeUndefined();
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
