import type {
    ISubmissionMetadata,
    SubmissionFileMetadata,
} from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { FileBuffer } from './file-buffer.entity';
import {
    SubmissionFile,
    type SubmissionFileRow,
} from './submission-file.entity';
import { Submission } from './submission.entity';

function buildRow(overrides: Partial<SubmissionFileRow> = {}): SubmissionFileRow {
  return {
    id: 'sf-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    submissionId: 'sub-1',
    primaryFileId: 'fb-1',
    altFileId: 'fb-2',
    thumbnailId: 'fb-3',
    fileName: 'x.png',
    hash: 'abc',
    mimeType: 'image/png',
    size: 5,
    width: 1,
    height: 1,
    hasThumbnail: false,
    hasAltFile: false,
    hasCustomThumbnail: false,
    metadata: {} as SubmissionFileMetadata,
    order: 0,
    ...overrides,
  } as SubmissionFileRow;
}

describe('SubmissionFile.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = SubmissionFile.fromRow(row);
    expect(entity).toBeInstanceOf(SubmissionFile);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['submission', 'file', 'thumbnail', 'altFile'],
    );
  });

  it('hydrates file relations when present', () => {
    const row = buildRow({
      file: {
        id: 'fb-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        submissionFileId: 'sf-1',
        buffer: Buffer.from('x'),
        fileName: 'x.png',
        mimeType: 'image/png',
        size: 1,
        width: 1,
        height: 1,
      },
      submission: {
        id: 'sub-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        type: SubmissionType.FILE,
        isScheduled: false,
        isTemplate: false,
        isMultiSubmission: false,
        isArchived: false,
        isInitialized: false,
        schedule: { scheduleType: ScheduleType.NONE },
        metadata: {} as ISubmissionMetadata,
        order: 0,
      },
    });
    const entity = SubmissionFile.fromRow(row);
    expect(entity.file).toBeInstanceOf(FileBuffer);
    expect(entity.submission).toBeInstanceOf(Submission);
  });

  it('leaves optional relations undefined when absent', () => {
    const entity = SubmissionFile.fromRow(buildRow());
    expect(entity.file).toBeUndefined();
    expect(entity.thumbnail).toBeUndefined();
    expect(entity.altFile).toBeUndefined();
  });
});
