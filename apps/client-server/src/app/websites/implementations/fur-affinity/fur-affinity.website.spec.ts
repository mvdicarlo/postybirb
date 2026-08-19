import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
    IFileBuffer,
    PostData,
    SubmissionRating,
} from '@postybirb/types';
import { PostingFile } from '../../../posting/models/posting-file';
import FurAffinity from './fur-affinity.website';
import { FurAffinityFileSubmission } from './models/fur-affinity-file-submission';
import { FurAffinityMessageSubmission } from './models/fur-affinity-message-submission';

const FLOOD_MESSAGE =
  'Flood protection. Please wait 10 seconds before trying to upload another submission.';
const FLOOD_BODY =
  '<div><strong>Flood protection.</strong> Please wait 10 seconds before trying to upload another submission. </div>';
const NOW = 1_000_000;

function httpResponse(body: string, responseUrl = 'https://www.furaffinity.net/') {
  return {
    body,
    responseUrl,
    statusCode: 200,
  };
}

function createWebsite() {
  const get = jest.fn();
  const post = jest.fn();
  const platform = {
    http: { get, post },
  } as unknown as PlatformService;
  const account = new Account({
    id: 'account-1',
    name: 'Fur Affinity',
    website: 'fur-affinity',
  });

  return {
    get,
    post,
    website: new FurAffinity(account, platform),
  };
}

function createFile(): PostingFile {
  return new PostingFile('file-1', {
    id: 'buffer-1',
    buffer: Buffer.from('image'),
    fileName: 'image.png',
    height: 1,
    mimeType: 'image/png',
    width: 1,
  } as IFileBuffer);
}

const filePostData = {
  options: {
    category: '1',
    description: 'Description',
    disableComments: false,
    folders: [],
    gender: '0',
    rating: SubmissionRating.GENERAL,
    scraps: false,
    species: '1',
    tags: ['tag-one', 'tag-two', 'tag-three'],
    theme: '1',
    title: 'Title',
  },
} as unknown as PostData<FurAffinityFileSubmission>;

const messagePostData = {
  options: {
    description: 'Description',
    feature: false,
    tags: [],
    title: 'Title',
  },
} as unknown as PostData<FurAffinityMessageSubmission>;

function expectRateLimited(response: Awaited<ReturnType<FurAffinity['post']>>) {
  expect(response).toMatchObject({
    additionalInfo: FLOOD_BODY,
    message: FLOOD_MESSAGE,
    rateLimitedUntil: new Date(NOW + 10_000).toISOString(),
  });
  expect(response.exception).toBeUndefined();
}

describe('FurAffinity flood protection', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['initial page', 'initial', 0],
    ['upload response', 'upload', 1],
    ['finalize response', 'finalize', 2],
  ] as const)(
    'returns a rate limit from the file %s',
    async (_label, checkpoint, expectedPostCalls) => {
      const { get, post, website } = createWebsite();
      const uploadPage =
        '<form id="upload_form"><input name="key" value="upload-key"></form>';
      const finalizePage =
        '<form id="myform"><input name="key" value="finalize-key"></form>';

      get.mockResolvedValue(
        httpResponse(checkpoint === 'initial' ? FLOOD_BODY : uploadPage),
      );
      if (checkpoint === 'upload') {
        post.mockResolvedValue(httpResponse(FLOOD_BODY));
      } else if (checkpoint === 'finalize') {
        post
          .mockResolvedValueOnce(httpResponse(finalizePage))
          .mockResolvedValueOnce(httpResponse(FLOOD_BODY));
      }

      const response = await website.onPostFileSubmission(
        filePostData,
        [createFile()],
        new CancellationToken(),
      );

      expectRateLimited(response);
      expect(get).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledTimes(expectedPostCalls);
    },
  );

  it.each([
    ['journal page', 'page', 0],
    ['journal response', 'response', 1],
  ] as const)(
    'returns a rate limit from the %s',
    async (_label, checkpoint, expectedPostCalls) => {
      const { get, post, website } = createWebsite();
      const journalPage =
        '<form id="journal-form"><input name="key" value="journal-key"></form>';

      get.mockResolvedValue(
        httpResponse(checkpoint === 'page' ? FLOOD_BODY : journalPage),
      );
      if (checkpoint === 'response') {
        post.mockResolvedValue(httpResponse(FLOOD_BODY));
      }

      const response = await website.onPostMessageSubmission(
        messagePostData,
        new CancellationToken(),
      );

      expectRateLimited(response);
      expect(get).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledTimes(expectedPostCalls);
    },
  );
});