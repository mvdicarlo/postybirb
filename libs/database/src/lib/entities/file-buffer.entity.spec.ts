import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { FileBuffer, type FileBufferRow } from './file-buffer.entity';

function buildRow(overrides: Partial<FileBufferRow> = {}): FileBufferRow {
  return {
    id: 'fb-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    submissionFileId: 'sf-1',
    buffer: Buffer.from('hello'),
    fileName: 'x.png',
    mimeType: 'image/png',
    size: 5,
    width: 1,
    height: 1,
    ...overrides,
  };
}

describe('FileBuffer.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = FileBuffer.fromRow(row);
    expect(entity).toBeInstanceOf(FileBuffer);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('strips buffer from toDTO', () => {
    const entity = FileBuffer.fromRow(buildRow());
    const dto = entity.toDTO() as Record<string, unknown>;
    expect(dto.buffer).toBeUndefined();
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(FileBuffer.fromRow(row, ctx)).toBe(FileBuffer.fromRow(row, ctx));
  });
});
