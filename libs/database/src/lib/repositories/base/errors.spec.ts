import { EntityNotFoundError, OptimisticConcurrencyError } from './errors';

describe('EntityNotFoundError', () => {
  it('uses the standardised message format', () => {
    const err = new EntityNotFoundError('SubmissionSchema', 'abc-123');
    expect(err.message).toBe('SubmissionSchema with id "abc-123" not found');
  });

  it('exposes schemaKey and entityId', () => {
    const err = new EntityNotFoundError('AccountSchema', 'xyz');
    expect(err.schemaKey).toBe('AccountSchema');
    expect(err.entityId).toBe('xyz');
  });

  it('is an instance of Error and named EntityNotFoundError', () => {
    const err = new EntityNotFoundError('AccountSchema', 'xyz');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('EntityNotFoundError');
  });
});

describe('OptimisticConcurrencyError', () => {
  it('formats a descriptive message', () => {
    const err = new OptimisticConcurrencyError('PostRecordSchema', 'id-1');
    expect(err.message).toBe(
      'Optimistic concurrency conflict on PostRecordSchema id "id-1"',
    );
  });

  it('exposes schemaKey and entityId', () => {
    const err = new OptimisticConcurrencyError('PostRecordSchema', 'id-1');
    expect(err.schemaKey).toBe('PostRecordSchema');
    expect(err.entityId).toBe('id-1');
  });

  it('is an instance of Error and named OptimisticConcurrencyError', () => {
    const err = new OptimisticConcurrencyError('PostRecordSchema', 'id-1');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('OptimisticConcurrencyError');
  });
});
