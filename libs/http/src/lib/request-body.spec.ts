import { FormFile } from './form-file';
import { createRequestBody } from './request-body';
import type { PostOptions } from './types';

describe('createRequestBody', () => {
  it('encodes JSON data', () => {
    expect(
      createRequestBody({
        type: 'json',
        data: { title: 'Example', tags: ['one', 'two'], enabled: false },
      }),
    ).toEqual({
      contentType: 'application/json',
      buffer: Buffer.from(
        '{"title":"Example","tags":["one","two"],"enabled":false}',
      ),
    });
  });

  it('encodes URL-encoded fields and indexes arrays by default', () => {
    const body = createRequestBody({
      type: 'urlencoded',
      data: { title: 'a & b', tags: ['one', 'two'] },
    });
    const fields = new URLSearchParams(body.buffer.toString());

    expect(body.contentType).toBe('application/x-www-form-urlencoded');
    expect(fields.get('title')).toBe('a & b');
    expect(fields.get('tags[0]')).toBe('one');
    expect(fields.get('tags[1]')).toBe('two');
  });

  it('supports disabling URL-encoded array indexing', () => {
    const body = createRequestBody({
      type: 'urlencoded',
      data: { tags: ['one', 'two'] },
      options: { skipUrlEncodedIndexing: true },
    });

    expect(
      new URLSearchParams(body.buffer.toString()).getAll('tags[]'),
    ).toEqual(['one', 'two']);
  });

  it('preserves the original binary buffer', () => {
    const buffer = Buffer.from([0, 128, 255]);
    const body = createRequestBody({ type: 'binary', data: buffer });

    expect(body.contentType).toBe('application/octet-stream');
    expect(body.buffer).toBe(buffer);
  });

  it('encodes multipart scalars, repeated fields, and files while omitting nullish fields', () => {
    const file = new FormFile(Buffer.from('file contents'), {
      filename: 'example.txt',
      contentType: 'text/plain',
    });
    const body = createRequestBody({
      type: 'multipart',
      data: {
        title: 'Example',
        count: 0,
        enabled: false,
        missing: undefined,
        empty: null,
        tags: ['one', 'two'],
        file,
        attachments: [file, 'caption'],
      },
    });
    const text = body.buffer.toString();
    const boundary = body.contentType.split('boundary=')[1];

    expect(body.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(text).toContain(`--${boundary}\r\n`);
    expect(text.endsWith(`--${boundary}--\r\n`)).toBe(true);
    expect(text).toContain('name="title"\r\n\r\nExample\r\n');
    expect(text).toContain('name="count"\r\n\r\n0\r\n');
    expect(text).toContain('name="enabled"\r\n\r\nfalse\r\n');
    expect(text).not.toContain('name="missing"');
    expect(text).not.toContain('name="empty"');
    expect(text.match(/name="tags"/g)).toHaveLength(2);
    expect(text.match(/name="attachments"/g)).toHaveLength(2);
    expect(text.match(/filename="example.txt"/g)).toHaveLength(2);
    expect(text).toContain('Content-Type: text/plain\r\n\r\nfile contents');
  });

  it('rejects unsupported body types', () => {
    expect(() =>
      createRequestBody({
        type: 'unsupported' as PostOptions['type'],
        data: {},
      }),
    ).toThrow('Unknown post type: unsupported');
  });
});
