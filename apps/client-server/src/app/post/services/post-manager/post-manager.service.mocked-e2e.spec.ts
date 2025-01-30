// import { clearDatabase } from '@postybirb/database';
// import {
//   FileSubmission,
//   FileType,
//   IAccount,
//   IFileBuffer,
//   ILoginState,
//   ISubmission,
//   ISubmissionFile,
//   IWebsiteOptions,
//   MessageSubmission,
//   NullAccount,
//   PostData,
//   PostRecordResumeMode,
//   PostRecordState,
//   PostResponse,
//   SubmissionRating,
//   SubmissionType,
// } from '@postybirb/types';
// import { readFileSync } from 'fs';
// import { join } from 'path';

// import {
//   PostRecord,
//   Submission,
//   WebsitePostRecord,
// } from '../../../drizzle/models';
// import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
// import { FileConverterService } from '../../../file-converter/file-converter.service';
// import { PostParsersService } from '../../../post-parsers/post-parsers.service';
// import { ValidationService } from '../../../validation/validation.service';
// import { defaultWebsiteDecoratorProps } from '../../../websites/decorators/website-decorator-props';
// import { BaseWebsiteOptions } from '../../../websites/models/base-website-options';
// import { DefaultWebsiteOptions } from '../../../websites/models/default-website-options';
// import { FileWebsite } from '../../../websites/models/website-modifiers/file-website';
// import { MessageWebsite } from '../../../websites/models/website-modifiers/message-website';
// import { UnknownWebsite } from '../../../websites/website';
// import { WebsiteRegistryService } from '../../../websites/website-registry.service';
// import { CancellableToken } from '../../models/cancellable-token';
// import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
// import { PostManagerService } from './post-manager.service';

// describe('PostManagerServiceMocks', () => {
//   let service: PostManagerService;
//   let postRepositoryMock: jest.Mocked<PostyBirbDatabase<'PostRecordSchema'>>;
//   let websitePostRecordRepositoryMock: jest.Mocked<
//     PostyBirbDatabase<'WebsitePostRecordSchema'>
//   >;
//   let websiteRegistryMock: jest.Mocked<WebsiteRegistryService>;
//   let resizerService: PostFileResizerService;
//   let postParserServiceMock: jest.Mocked<PostParsersService>;
//   let validationServiceMock: jest.Mocked<ValidationService>;
//   let fileConverterService: FileConverterService;

//   beforeEach(async () => {
//     clearDatabase();
//     postRepositoryMock = {
//       findOne: jest.fn(),
//       findById: jest.fn(),
//       update: jest.fn(),
//     } as unknown as jest.Mocked<PostyBirbDatabase<'PostRecordSchema'>>;
//     websitePostRecordRepositoryMock = {
//       insert: jest.fn(),
//       findOne: jest.fn(),
//       findById: jest.fn(),
//       update: jest.fn(),
//     } as unknown as jest.Mocked<PostyBirbDatabase<'WebsitePostRecordSchema'>>;
//     websiteRegistryMock = {
//       findInstance: jest.fn(),
//       findOne: jest.fn(),
//       update: jest.fn(),
//     } as unknown as jest.Mocked<WebsiteRegistryService>;
//     resizerService = new PostFileResizerService();
//     postParserServiceMock = {
//       parse: jest.fn(),
//       findOne: jest.fn(),
//       update: jest.fn(),
//     } as unknown as jest.Mocked<PostParsersService>;
//     validationServiceMock = {
//       validateSubmission: jest.fn(),
//     } as unknown as jest.Mocked<ValidationService>;
//     fileConverterService = new FileConverterService();

//     service = new PostManagerService(
//       postRepositoryMock,
//       websitePostRecordRepositoryMock,
//       websiteRegistryMock,
//       resizerService,
//       postParserServiceMock,
//       validationServiceMock,
//       fileConverterService,
//     );
//   });

//   function createMessageSubmission(): MessageSubmission {
//     const submission: MessageSubmission = {
//       id: 'test',
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       metadata: {},
//       type: SubmissionType.MESSAGE,
//       files: [],
//       options: [],
//       isScheduled: false,
//       schedule: {} as never,
//       order: 1,
//       posts: [] as never,
//       isTemplate: false,
//       isMultiSubmission: false,
//       isArchived: false,
//     };

//     return submission;
//   }

//   function createFileSubmission(): FileSubmission {
//     const submission: FileSubmission = {
//       id: 'test',
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       metadata: {
//         order: [],
//         fileMetadata: {},
//       },
//       type: SubmissionType.FILE,
//       files: [],
//       options: [],
//       isScheduled: false,
//       schedule: {} as never,
//       order: 1,
//       posts: [] as never,
//       isTemplate: false,
//       isMultiSubmission: false,
//       isArchived: false,
//     };

//     // 600 x 600 image (png)
//     const testFile = readFileSync(
//       join(__dirname, '../../../test-files/png_no_alpha.png'),
//     );
//     const file: ISubmissionFile = {
//       submission,
//       id: 'test-file',
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       fileName: 'test.png',
//       hash: 'fake-hash',
//       mimeType: 'image/png',
//       size: testFile.length,
//       width: 600,
//       height: 600,
//       hasAltFile: false,
//       hasThumbnail: false,
//       hasCustomThumbnail: false,
//       file: {} as IFileBuffer,
//     };

//     file.file = {
//       id: 'test-file-buffer',
//       fileName: 'test.png',
//       mimeType: 'image/png',
//       buffer: testFile,
//       size: testFile.length,
//       width: 600,
//       height: 600,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//     };

//     submission.metadata.order.push(file.id);
//     submission.metadata.fileMetadata[file.id] = {
//       altText: 'Test Alt Text',
//       spoilerText: 'Test Spoiler Text',
//       ignoredWebsites: [],
//       dimensions: {},
//     };

//     submission.files.push(file);

//     return submission as FileSubmission;
//   }

//   function createPostRecord(submission: ISubmission): PostRecord {
//     const postRecord: PostRecord = {
//       parent: submission as Submission,
//       state: PostRecordState.PENDING,
//       resumeMode: PostRecordResumeMode.CONTINUE,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       id: 'test-post-record',
//       children: [],
//       toDTO: jest.fn().mockReturnValue({}),
//     };

//     postRecord.toDTO = jest.fn().mockReturnValue({});
//     return postRecord as unknown as PostRecord;
//   }

//   function createAccount(): IAccount {
//     return {
//       id: 'test-account',
//       name: 'Test Account',
//       website: 'test',
//       groups: [],
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//     };
//   }

//   function createWebsiteOptions(
//     submission: ISubmission,
//     account: IAccount,
//   ): IWebsiteOptions[] {
//     return [
//       {
//         id: 'default',
//         account: new NullAccount(),
//         submission,
//         isDefault: true,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//         data: { ...new DefaultWebsiteOptions() },
//       },
//       {
//         id: 'instance-options',
//         account,
//         submission,
//         isDefault: false,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//         data: { ...new BaseWebsiteOptions() },
//       },
//     ];
//   }

//   function mockFileSubmissionPost() {
//     const submission = createFileSubmission();
//     const account = createAccount();
//     const websiteOptions = createWebsiteOptions(submission, account);
//     websiteOptions.forEach((option) => submission.options.push(option));
//     const postRecord: PostRecord = createPostRecord(submission);
//     const websiteInstance: UnknownWebsite = {
//       id: 'test',
//       supportsFile: true,
//       supportsMessage: false,
//       decoratedProps: {
//         ...defaultWebsiteDecoratorProps(),
//         fileOptions: {
//           acceptedMimeTypes: ['image/jpeg', 'image/png'],
//           fileBatchSize: 1,
//           supportedFileTypes: [FileType.IMAGE],
//         },
//       },
//       getLoginState: jest.fn().mockReturnValue({
//         isLoggedIn: true,
//         pending: false,
//         username: 'test',
//       } as ILoginState),
//       getSupportedTypes: jest.fn().mockReturnValue([SubmissionType.FILE]),
//     } as unknown as UnknownWebsite;

//     postRepositoryMock.findOne.mockResolvedValue(Promise.resolve(postRecord));
//     postRepositoryMock.update.mockImplementation(async (id, record) => {
//       Object.assign(postRecord, record);
//       return record as unknown as PostRecord;
//     });
//     websitePostRecordRepositoryMock.insert.mockImplementation(
//       (record) =>
//         ({
//           ...record,
//           id: new Date().getTime().toString(),
//           createdAt: new Date().toISOString(),
//           updatedAt: new Date().toISOString(),
//           metadata: {
//             sourceMap: {},
//             postedFiles: [],
//             nextBatchNumber: 1,
//           },
//         }) as WebsitePostRecord,
//     );
//     websiteRegistryMock.findInstance.mockReturnValue(websiteInstance);
//     const postData: PostData = {
//       submission,
//       options: {
//         title: 'Test Title',
//         description: 'Test Description',
//         rating: SubmissionRating.GENERAL,
//         tags: ['test'],
//       },
//     };
//     postParserServiceMock.parse.mockResolvedValue(postData);
//     validationServiceMock.validateSubmission.mockResolvedValue(
//       Promise.resolve([]),
//     );

//     return {
//       postRecord,
//       submission,
//       websiteOptions,
//       websiteInstance,
//       postData,
//     };
//   }

//   function mockMessageSubmissionPost() {
//     const submission = createMessageSubmission();
//     const account = createAccount();
//     const websiteOptions = createWebsiteOptions(submission, account);
//     websiteOptions.forEach((option) => submission.options.push(option));
//     const postRecord: PostRecord = createPostRecord(submission);
//     const websiteInstance: UnknownWebsite = {
//       id: 'test',
//       supportsFile: false,
//       supportsMessage: true,
//       decoratedProps: defaultWebsiteDecoratorProps(),
//       getLoginState: jest.fn().mockReturnValue({
//         isLoggedIn: true,
//         pending: false,
//         username: 'test',
//       } as ILoginState),
//       getSupportedTypes: jest.fn().mockReturnValue([SubmissionType.MESSAGE]),
//     } as unknown as UnknownWebsite;

//     postRepositoryMock.findOne.mockResolvedValue(Promise.resolve(postRecord));
//     postRepositoryMock.update.mockImplementation(async (id, record) => {
//       Object.assign(postRecord, record);
//       return record as unknown as PostRecord;
//     });
//     websitePostRecordRepositoryMock.insert.mockImplementation(
//       (record) =>
//         ({
//           ...record,
//           id: new Date().getTime().toString(),
//           createdAt: new Date().toISOString(),
//           updatedAt: new Date().toISOString(),
//           metadata: {
//             sourceMap: {},
//             postedFiles: [],
//             nextBatchNumber: 1,
//           },
//         }) as WebsitePostRecord,
//     );
//     websiteRegistryMock.findInstance.mockReturnValue(websiteInstance);
//     postParserServiceMock.parse.mockResolvedValue({
//       submission,
//       options: {
//         title: 'Test Title',
//         description: 'Test Description',
//         rating: SubmissionRating.GENERAL,
//         tags: ['test'],
//       },
//     } as PostData);
//     validationServiceMock.validateSubmission.mockResolvedValue(
//       Promise.resolve([]),
//     );

//     return { postRecord, submission, websiteOptions, websiteInstance };
//   }

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   it('should post a file submission successfully', async () => {
//     // This more or less tests the happy path
//     // No resize is considered here
//     const { postRecord, websiteInstance, postData, submission } =
//       mockFileSubmissionPost();

//     const response: PostResponse = {
//       exception: undefined,
//       sourceUrl: 'https://test.postybirb.com',
//     };
//     (websiteInstance as unknown as FileWebsite).onPostFileSubmission = jest
//       .fn()
//       .mockResolvedValue(response);
//     (websiteInstance as unknown as FileWebsite).calculateImageResize = jest
//       .fn()
//       .mockReturnValue(undefined);

//     await service.startPost(postRecord);
//     expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
//       1,
//       postRecord.id,
//       {
//         state: PostRecordState.RUNNING,
//       },
//     );
//     expect(
//       (websiteInstance as unknown as FileWebsite).onPostFileSubmission,
//     ).toHaveBeenCalledWith(
//       postData,
//       expect.any(Array),
//       1,
//       expect.any(CancellableToken),
//     );
//     expect(postRecord.state).toBe(PostRecordState.DONE);
//     expect(postRecord.completedAt).toBeDefined();
//     expect(postRecord.children).toHaveLength(1);
//     expect(postRecord.children[0].completedAt).toBeDefined();
//     expect(postRecord.children[0].errors).toBeUndefined();
//     expect(
//       postRecord.children[0].metadata.sourceMap[submission.files[0].id],
//     ).toEqual(response.sourceUrl);
//   });

//   it('should post a file submission with resize', async () => {
//     const { postRecord, websiteInstance, postData, submission } =
//       mockFileSubmissionPost();

//     const response: PostResponse = {
//       exception: undefined,
//       sourceUrl: 'https://test.postybirb.com',
//     };
//     (websiteInstance as unknown as FileWebsite).onPostFileSubmission = async (
//       d,
//       files,
//       i,
//       c,
//     ) => {
//       if (files[0].height === 300 && files[0].width === 300) {
//         return response;
//       }
//       throw new Error('Invalid file dimensions');
//     };
//     (websiteInstance as unknown as FileWebsite).calculateImageResize = jest
//       .fn()
//       .mockReturnValue({
//         width: 300,
//         height: 300,
//       });

//     await service.startPost(postRecord);
//     expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
//       1,
//       postRecord.id,
//       {
//         state: PostRecordState.RUNNING,
//       },
//     );
//     expect(postRecord.state).toBe(PostRecordState.DONE);
//   });

//   it('should post a message submission successfully', async () => {
//     // This more or less tests the happy path
//     const { postRecord, websiteInstance } = mockMessageSubmissionPost();

//     const response: PostResponse = {
//       exception: undefined,
//       sourceUrl: 'https://test.postybirb.com',
//     };
//     (websiteInstance as unknown as MessageWebsite).onPostMessageSubmission =
//       jest.fn().mockResolvedValue(Promise.resolve(response));

//     await service.startPost(postRecord);
//     expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
//       1,
//       postRecord.id,
//       {
//         state: PostRecordState.RUNNING,
//       },
//     );
//     expect(postRecord.state).toBe(PostRecordState.DONE);
//     expect(postRecord.completedAt).toBeDefined();
//     expect(postRecord.children).toHaveLength(1);
//     expect(postRecord.children[0].completedAt).toBeDefined();
//     expect(postRecord.children[0].errors).toBeUndefined();
//     expect(postRecord.children[0].metadata.source).toEqual(response.sourceUrl);
//   });

//   it('should post a message submission unsuccessfully at post time', async () => {
//     // This more or less tests the happy path
//     const { postRecord, websiteInstance } = mockMessageSubmissionPost();

//     const response: PostResponse = {
//       exception: new Error('Test Error'),
//     };
//     (websiteInstance as unknown as MessageWebsite).onPostMessageSubmission =
//       jest.fn().mockResolvedValue(Promise.resolve(response));

//     await service.startPost(postRecord);
//     expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
//       1,
//       postRecord.id,
//       {
//         state: PostRecordState.RUNNING,
//       },
//     );
//     expect(postRecord.state).toBe(PostRecordState.FAILED);
//     expect(postRecord.completedAt).toBeDefined();
//     expect(postRecord.children).toHaveLength(1);
//     expect(postRecord.children[0].completedAt).toBeUndefined();
//     expect(postRecord.children[0].errors).toBeDefined();
//   });
// });
