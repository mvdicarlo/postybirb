import { Account } from '@postybirb/database';
import { FormFile } from '@postybirb/http/types';
import { PlatformService } from '@postybirb/platform';
import {
  IFileBuffer,
  PhilomenaAccountData,
  PostData,
  SubmissionRating,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import Derpibooru from '../derpibooru/derpibooru.website';
import { DerpibooruFileSubmission } from '../derpibooru/models/derpibooru-file-submission';

type WebsiteDataStore = {
  getData: jest.Mock<PhilomenaAccountData, []>;
};

function createWebsite() {
  const get = jest.fn();
  const post = jest.fn();
  const platform = {
    http: { get, post },
  } as unknown as PlatformService;
  const account = new Account({
    id: 'account-1',
    name: 'Derpibooru',
    website: 'derpibooru',
  });
  const website = new Derpibooru(account, platform);
  const dataStore = Reflect.get(
    website,
    'websiteDataStore',
  ) as WebsiteDataStore;
  dataStore.getData = jest.fn().mockReturnValue({
    username: 'tester',
    key: 'api-key',
  });

  return { dataStore, get, post, website };
}

function createFile(sourceCount = 2): PostingFile {
  return new PostingFile('file-1', {
    id: 'buffer-1',
    buffer: Buffer.from('image'),
    fileName: 'image.png',
    height: 1,
    mimeType: 'image/png',
    width: 1,
  } as IFileBuffer).withMetadata({
    dimensions: {},
    ignoredWebsites: [],
    sourceUrls: Array.from(
      { length: sourceCount },
      (_, index) => `https://example.com/source-${index + 1}`,
    ),
  });
}

const postData = {
  options: {
    description: 'Description',
    rating: SubmissionRating.GENERAL,
    tags: ['artist:test', 'solo', 'portrait'],
  },
} as unknown as PostData<DerpibooruFileSubmission>;

function httpResponse<T>(body: T, statusCode = 200) {
  return {
    body,
    responseUrl: 'https://derpibooru.org/api/v1/json/images',
    statusCode,
    statusMessage: 'OK',
  };
}

describe('Philomena API login', () => {
  it('uses the shared custom API-key login flow', () => {
    const { website } = createWebsite();

    expect(website.decoratedProps.loginFlow).toEqual({
      type: 'custom',
      loginComponentName: 'Philomena',
    });
    expect(website.externallyAccessibleWebsiteDataProperties).toEqual({
      username: true,
      key: false,
    });
  });

  it('validates stored credentials through an authenticated API endpoint', async () => {
    const { get, website } = createWebsite();
    get.mockResolvedValue(httpResponse({ filters: [] }));

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true,
      username: 'tester',
    });
    expect(get).toHaveBeenCalledWith(
      'https://derpibooru.org/api/v1/json/filters/user?key=api-key&per_page=1',
      { partition: '' },
    );
  });

  it.each([401, 403])(
    'rejects credentials returning HTTP %s',
    async (statusCode) => {
      const { get, website } = createWebsite();
      get.mockResolvedValue(httpResponse('', statusCode));

      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    },
  );

  it('rejects accounts without complete API credentials', async () => {
    const { dataStore, get, website } = createWebsite();
    dataStore.getData.mockReturnValue({ username: '', key: '' });

    await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces transient API failures without clearing a previous login', async () => {
    const { get, website } = createWebsite();
    get.mockResolvedValueOnce(httpResponse({ filters: [] }));
    const previous = await website.login();
    get.mockResolvedValue(httpResponse('', 503));

    await expect(website.login()).resolves.toEqual(previous);
  });

  it('trims, validates, and stores credentials from the custom login flow', async () => {
    const { dataStore, get, website } = createWebsite();
    let storedData: PhilomenaAccountData = { username: '', key: '' };
    dataStore.getData.mockImplementation(() => storedData);
    jest.spyOn(website, 'setWebsiteData').mockImplementation(async (data) => {
      storedData = data;
    });
    get.mockResolvedValue(httpResponse({ filters: [] }));

    await expect(
      website.onAuthRoute.login({
        username: ' tester ',
        key: ' api-key ',
      }),
    ).resolves.toEqual({ result: true });
    expect(website.setWebsiteData).toHaveBeenCalledWith({
      username: 'tester',
      key: 'api-key',
    });
  });

  it('does not store invalid credentials', async () => {
    const { get, website } = createWebsite();
    const setWebsiteData = jest.spyOn(website, 'setWebsiteData');
    get.mockResolvedValue(httpResponse('', 403));

    await expect(
      website.onAuthRoute.login({ username: 'tester', key: 'invalid' }),
    ).resolves.toEqual({ result: false });
    expect(setWebsiteData).not.toHaveBeenCalled();
  });
});

describe('Philomena API image posting', () => {
  it('uploads an image through the authenticated JSON API', async () => {
    const { post, website } = createWebsite();
    post.mockResolvedValue(httpResponse({ image: { id: 123 } }));

    const response = await website.onPostFileSubmission(
      postData,
      [createFile()],
      new CancellationToken(),
    );

    expect(response).toMatchObject({
      additionalInfo: {
        body: { image: { id: 123 } },
        statusCode: 200,
      },
      sourceUrl: 'https://derpibooru.org/images/123',
    });
    expect(response.exception).toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      'https://derpibooru.org/api/v1/json/images',
      {
        partition: '',
        type: 'multipart',
        data: {
          key: 'api-key',
          'image[anonymous]': 'false',
          'image[tag_input]': 'artist:test, solo, portrait, safe',
          'image[image]': expect.any(FormFile),
          'image[description]': 'Description',
          'image[sources][0][source]': 'https://example.com/source-1',
          'image[sources][1][source]': 'https://example.com/source-2',
        },
      },
    );
  });

  it('limits source URLs to the Philomena maximum of 15', async () => {
    const { post, website } = createWebsite();
    post.mockResolvedValue(httpResponse({ image: { id: 123 } }));

    await website.onPostFileSubmission(
      postData,
      [createFile(16)],
      new CancellationToken(),
    );

    const request = post.mock.calls[0][1];
    expect(request.data['image[sources][14][source]']).toBe(
      'https://example.com/source-15',
    );
    expect(request.data['image[sources][15][source]']).toBeUndefined();
  });

  it('returns structured Philomena validation errors', async () => {
    const { post, website } = createWebsite();
    post.mockResolvedValue(
      httpResponse(
        {
          errors: {
            image: ["has already been uploaded: it's image 123"],
            tag_input: ['should have at least 3 tags'],
          },
        },
        400,
      ),
    );

    const response = await website.onPostFileSubmission(
      postData,
      [createFile()],
      new CancellationToken(),
    );

    expect(response.exception?.message).toBe(
      "image has already been uploaded: it's image 123; tag input should have at least 3 tags",
    );
  });

  it.each([
    [401, 'Philomena rejected the API key.'],
    [403, 'This account is not allowed to post through the Philomena API.'],
    [500, 'Philomena image upload failed with HTTP 500.'],
  ])('returns a useful error for HTTP %s', async (statusCode, message) => {
    const { post, website } = createWebsite();
    post.mockResolvedValue(httpResponse('', statusCode));

    const response = await website.onPostFileSubmission(
      postData,
      [createFile()],
      new CancellationToken(),
    );

    expect(response.exception?.message).toContain(message);
  });

  it('rejects successful responses without an image ID', async () => {
    const { post, website } = createWebsite();
    post.mockResolvedValue(httpResponse({ image: {} }));

    const response = await website.onPostFileSubmission(
      postData,
      [createFile()],
      new CancellationToken(),
    );

    expect(response.exception?.message).toBe(
      'Philomena did not return the created image ID.',
    );
  });

  it('does not send a request without an API key', async () => {
    const { dataStore, post, website } = createWebsite();
    dataStore.getData.mockReturnValue({ username: 'tester', key: '' });

    const response = await website.onPostFileSubmission(
      postData,
      [createFile()],
      new CancellationToken(),
    );

    expect(response.exception?.message).toContain(
      'A Philomena API key is required',
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('does not send a request after cancellation', async () => {
    const { post, website } = createWebsite();
    const token = new CancellationToken();
    token.abort(new Error('Task was cancelled.'));

    await expect(
      website.onPostFileSubmission(postData, [createFile()], token),
    ).rejects.toThrow('Task was cancelled.');
    expect(post).not.toHaveBeenCalled();
  });
});
