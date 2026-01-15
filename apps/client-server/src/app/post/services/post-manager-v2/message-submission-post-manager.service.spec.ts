import { clearDatabase } from '@postybirb/database';
import {
    AccountId,
    EntityId,
    IPostResponse,
    PostData,
    PostEventType,
    PostRecordState,
    SubmissionRating,
    SubmissionType,
} from '@postybirb/types';
import 'reflect-metadata';
import { PostRecord, Submission } from '../../../drizzle/models';
import { NotificationsService } from '../../../notifications/notifications.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { MessageWebsite } from '../../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { CancellableToken } from '../../models/cancellable-token';
import { PostEventRepository } from '../post-record-factory';
import { MessageSubmissionPostManager } from './message-submission-post-manager.service';

describe('MessageSubmissionPostManager', () => {
  let manager: MessageSubmissionPostManager;
  let postEventRepositoryMock: jest.Mocked<PostEventRepository>;
  let websiteRegistryMock: jest.Mocked<WebsiteRegistryService>;
  let postParserServiceMock: jest.Mocked<PostParsersService>;
  let validationServiceMock: jest.Mocked<ValidationService>;
  let notificationServiceMock: jest.Mocked<NotificationsService>;

  beforeEach(() => {
    clearDatabase();

    postEventRepositoryMock = {
      insert: jest.fn().mockResolvedValue({}),
      findByPostRecordId: jest.fn().mockResolvedValue([]),
      getCompletedAccounts: jest.fn().mockResolvedValue([]),
      getFailedEvents: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PostEventRepository>;

    websiteRegistryMock = {
      findInstance: jest.fn(),
    } as unknown as jest.Mocked<WebsiteRegistryService>;

    postParserServiceMock = {
      parse: jest.fn(),
    } as unknown as jest.Mocked<PostParsersService>;

    validationServiceMock = {
      validateSubmission: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ValidationService>;

    notificationServiceMock = {
      create: jest.fn(),
      sendDesktopNotification: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    manager = new MessageSubmissionPostManager(
      postEventRepositoryMock,
      websiteRegistryMock,
      postParserServiceMock,
      validationServiceMock,
      notificationServiceMock,
    );
  });

  function createSubmission(): Submission {
    return new Submission({
      id: 'test-submission',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      type: SubmissionType.MESSAGE,
      files: [],
      options: [],
      isScheduled: false,
      schedule: {} as never,
      order: 1,
      posts: [] as never,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
    });
  }

  function createPostRecord(submission: Submission): PostRecord {
    return new PostRecord({
      id: 'test-post-record' as EntityId,
      submission,
      state: PostRecordState.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
    });
  }

  function createMockWebsite(accountId: AccountId): UnknownWebsite {
    return {
      id: 'test-website',
      account: {
        id: accountId,
        name: 'test-account',
      },
      decoratedProps: {
        metadata: {
          name: 'Test Website',
          displayName: 'Test Website',
        },
      },
      onPostMessageSubmission: jest.fn(),
    } as unknown as UnknownWebsite;
  }

  describe('getSupportedType', () => {
    it('should return MESSAGE submission type', () => {
      expect(manager.getSupportedType()).toBe(SubmissionType.MESSAGE);
    });
  });

  describe('attemptToPost', () => {
    let mockWebsite: UnknownWebsite;
    let postRecord: PostRecord;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      const submission = createSubmission();
      postRecord = createPostRecord(submission);
      mockWebsite = createMockWebsite(accountId);

      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      postData = {
        submission,
        options: {
          title: 'Test Title',
          description: 'Test Description',
          rating: SubmissionRating.GENERAL,
          tags: ['test'],
        },
      } as PostData;
    });

    it('should successfully post a message and emit MESSAGE_POSTED event', async () => {
      const sourceUrl = 'https://example.com/message/123';
      const responseMessage = 'Message posted successfully';

      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl,
        message: responseMessage,
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify website method was called
      expect(
        (mockWebsite as unknown as MessageWebsite).onPostMessageSubmission,
      ).toHaveBeenCalledWith(postData, cancelToken);

      // Verify MESSAGE_POSTED event was emitted
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          postRecordId: postRecord.id,
          accountId,
          eventType: PostEventType.MESSAGE_POSTED,
          sourceUrl,
          metadata: expect.objectContaining({
            accountSnapshot: {
              name: 'test-account',
              website: 'Test Website',
            },
            responseMessage,
          }),
        }),
      );
    });

    it('should emit MESSAGE_FAILED event and throw on error', async () => {
      const errorMessage = 'Failed to post message';
      const exception = new Error('API Error');
      const stage = 'upload';
      const additionalInfo = { code: 'ERR_API' };

      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        message: errorMessage,
        exception,
        stage,
        additionalInfo,
      } as IPostResponse);

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('API Error');

      // Verify MESSAGE_FAILED event was emitted
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          postRecordId: postRecord.id,
          accountId,
          eventType: PostEventType.MESSAGE_FAILED,
          error: expect.objectContaining({
            message: errorMessage,
            stage,
            additionalInfo,
          }),
        }),
      );
    });

    it('should emit MESSAGE_FAILED event with unknown error when no message provided', async () => {
      const exception = new Error('Unknown API Error');

      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        exception,
      } as IPostResponse);

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('Unknown API Error');

      // Verify MESSAGE_FAILED event was emitted with default message
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: PostEventType.MESSAGE_FAILED,
          error: expect.objectContaining({
            message: 'Unknown error',
          }),
        }),
      );
    });

    it('should wait for posting interval before posting', async () => {
      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/message/123',
      });

      // Set last time posted to 2 seconds ago
      const now = new Date();
      const lastTime = new Date(now.getTime() - 2000);
      (manager as any).lastTimePostedToWebsite[accountId] = lastTime;

      const startTime = Date.now();
      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );
      const elapsed = Date.now() - startTime;

      // Should have waited approximately 3 seconds (5 seconds min interval - 2 seconds elapsed)
      expect(elapsed).toBeGreaterThanOrEqual(2900);
      expect(elapsed).toBeLessThan(4000);
    });

    it('should not wait if no previous post to account', async () => {
      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/message/123',
      });

      const startTime = Date.now();
      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );
      const elapsed = Date.now() - startTime;

      // Should not wait
      expect(elapsed).toBeLessThan(1000);
    });

    it('should not wait if enough time has passed since last post', async () => {
      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/message/123',
      });

      // Set last time posted to 10 seconds ago (beyond min interval)
      const now = new Date();
      const lastTime = new Date(now.getTime() - 10000);
      (manager as any).lastTimePostedToWebsite[accountId] = lastTime;

      const startTime = Date.now();
      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );
      const elapsed = Date.now() - startTime;

      // Should not wait
      expect(elapsed).toBeLessThan(1000);
    });

    it('should check cancel token during posting', async () => {
      // Cancel immediately
      cancelToken.cancel();

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('Task was cancelled');

      // Website method should not have been called
      expect(
        (mockWebsite as unknown as MessageWebsite).onPostMessageSubmission,
      ).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting behavior', () => {
    it('should enforce 5 second minimum interval between posts to same account', async () => {
      const accountId = 'rate-limit-account' as AccountId;
      const submission = createSubmission();
      const postRecord = createPostRecord(submission);
      const mockWebsite = createMockWebsite(accountId);

      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/message/123',
      });

      const cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      const postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // First post - should not wait
      const start1 = Date.now();
      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );
      const elapsed1 = Date.now() - start1;
      expect(elapsed1).toBeLessThan(1000);

      // Record the time of first post
      (manager as any).lastTimePostedToWebsite[accountId] = new Date();

      // Immediate second post - should wait ~5 seconds
      const start2 = Date.now();
      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );
      const elapsed2 = Date.now() - start2;
      expect(elapsed2).toBeGreaterThanOrEqual(4900);
      expect(elapsed2).toBeLessThan(6000);
    }, 10000);
  });

  describe('event metadata structure', () => {
    it('should create events with proper metadata structure', async () => {
      const accountId = 'metadata-account' as AccountId;
      const submission = createSubmission();
      const postRecord = createPostRecord(submission);
      const mockWebsite = createMockWebsite(accountId);

      (
        mockWebsite as unknown as MessageWebsite
      ).onPostMessageSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/message/456',
        message: 'Successfully posted message',
      });

      const cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      const postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith({
        postRecordId: postRecord.id,
        accountId,
        eventType: PostEventType.MESSAGE_POSTED,
        sourceUrl: 'https://example.com/message/456',
        metadata: {
          accountSnapshot: {
            name: 'test-account',
            website: 'Test Website',
          },
          responseMessage: 'Successfully posted message',
        },
      });
    });
  });
});
