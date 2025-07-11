import { IFileBuffer } from '@postybirb/types';
import { FormFile } from '../../../../../../libs/http/src/lib/form-file'; // Direct import to avoid electron loading
import { CancellableToken } from '../../post/models/cancellable-token';
import { PostingFile } from '../../post/models/posting-file';
import { PostBuilder } from './post-builder';

// Mocks
const mockWebsite = {
  account: { id: 'test-account' },
  constructor: { name: 'MockWebsite' },
};

jest.mock('@postybirb/logger', () => ({
  Logger: () => ({
    withMetadata: () => ({ debug: jest.fn() }),
    debug: jest.fn(),
  }),
}));
jest.mock('@postybirb/http', () => ({
  Http: {
    post: jest.fn().mockResolvedValue({ statusCode: 200, body: { id: '123' } }),
  },
  FormFile: FormFile,
}));

function createPostingFile(overrides = {}) {
  // Minimal IFileBuffer
  const fileBuffer: IFileBuffer = {
    id: 'file1',
    buffer: Buffer.from('test'),
    mimeType: 'image/png',
    width: 100,
    height: 100,
    fileName: 'file1.png',
    ...overrides,
    submissionFileId: '',
    size: 0,
    createdAt: '',
    updatedAt: '',
  };
  return new PostingFile('file1', fileBuffer);
}

describe('PostBuilder', () => {
  let builder: PostBuilder;
  let token: CancellableToken;

  beforeEach(() => {
    token = new CancellableToken();
    builder = new PostBuilder(mockWebsite as any, token);
  });

  it('should set headers', () => {
    builder.withHeader('X-Test', 'abc');
    expect((builder as any).headers['X-Test']).toBe('abc');
  });

  it('should set post type', () => {
    builder.asMultipart();
    expect((builder as any).postType).toBe('multipart');
    builder.asJson();
    expect((builder as any).postType).toBe('json');
    builder.asUrlEncoded();
    expect((builder as any).postType).toBe('urlencoded');
  });

  it('should merge data with withData', () => {
    builder.withData({ a: 1, b: 2 });
    builder.withData({ b: 3, c: 4 });
    expect((builder as any).data).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should set, get, and remove fields', () => {
    builder.setField('foo', 'bar');
    expect(builder.getField('foo')).toBe('bar');
    builder.removeField('foo');
    expect(builder.getField('foo')).toBeUndefined();
  });

  it('should set fields conditionally', () => {
    builder.setConditional('x', true, 1, 2);
    expect((builder as any).data['x']).toBe(1);
    builder.setConditional('y', false, 1, 2);
    expect((builder as any).data['y']).toBe(2);
    builder.setConditional('z', false, 1);
    expect((builder as any).data['z']).toBeUndefined();
  });

  it('should iterate with forEach', () => {
    builder.forEach(['a', 'b'], (item, idx, b) => {
      b.setField(`item${idx}`, item);
    });
    expect((builder as any).data['item0']).toBe('a');
    expect((builder as any).data['item1']).toBe('b');
  });

  it('should add files and thumbnails', () => {
    const file = createPostingFile();
    builder.addFile('file', file);
    expect((builder as any).data['file']).toBeInstanceOf(Object); // FormFile
    builder.addFiles('files', [file, file]);
    expect(Array.isArray((builder as any).data['files'])).toBe(true);
    builder.addThumbnail('thumb', file);
    expect((builder as any).data['thumb']).toBeInstanceOf(Object); // FormFile
  });

  it('should add image as thumbnail if no thumbnail', () => {
    const file = createPostingFile();
    builder.addThumbnail('thumb', file);
    expect((builder as any).data['thumb']).toBeInstanceOf(Object); // FormFile
  });

  it('should set empty string as thumbnail for non-image', () => {
    const file = createPostingFile({
      fileName: 'file1.txt',
      mimeType: 'text/plain',
    });
    builder.addThumbnail('thumb', file);
    expect((builder as any).data['thumb']).toBe('');
  });

  it('should call whenTrue only if predicate is true', () => {
    const cb = jest.fn();
    builder.whenTrue(true, cb);
    expect(cb).toHaveBeenCalled();
    cb.mockClear();
    builder.whenTrue(false, cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it('should build data for json and multipart', () => {
    builder.setField('a', true).setField('b', [true, false, undefined]);
    expect(builder.build()).toEqual({ a: true, b: [true, false, undefined] });
    builder.asMultipart();
    expect(builder.build()).toEqual({ a: 'true', b: ['true', 'false'] });
  });

  it('should sanitize file fields for logging', () => {
    const file = createPostingFile();
    builder.addFile('file', file);
    const data = { file: builder.getField('file'), other: 123 };
    const sanitized = (builder as any).sanitizeDataForLogging(data);
    expect(typeof sanitized.file).toBe('string');
    expect(sanitized.other).toBe(123);
  });

  it('should throw if cancelled before send', async () => {
    token.cancel();
    await expect(builder.send('http://test')).rejects.toThrow(
      'Task was cancelled.',
    );
  });

  it('should call Http.post and return value on send', async () => {
    const result = await builder.send<{ id: string }>('http://test');
    expect(result.body.id).toBe('123');
  });

  it('should convert PostingFile to FormFile', () => {
    const file = createPostingFile();
    const builder = new PostBuilder(mockWebsite as any, token);
    builder.setField('file', file);
    expect((builder as any).data['file']).toBeInstanceOf(FormFile);

    builder.addFile('file2', file);
    expect((builder as any).data['file2']).toBeInstanceOf(FormFile);
  });
});
