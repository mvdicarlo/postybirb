import 'reflect-metadata';
import { fromDatabaseRecord } from './database-entity';
import { TagConverter } from './tag-converter.entity';

describe('DatabaseEntity', () => {
  let entity: TagConverter;

  beforeEach(() => {
    entity = new TagConverter({
      id: 'id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tag: 'tag',
      convertTo: { tag: 'tag' },
    });
  });

  it('should create an instance', () => {
    expect(entity).toBeTruthy();
  });

  it('should convert class to object', () => {
    const obj = entity.toObject();
    expect(obj).toBeTruthy();
  });

  it('should succeed fromDatabaseObject', () => {
    const dbObj = {
      id: 'id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tag: 'tag',
      convertTo: { tag: 'tag' },
    };
    const obj = fromDatabaseRecord(TagConverter, dbObj);
    expect(obj).toBeTruthy();
    expect(obj.id).toBe(dbObj.id);
    expect(obj.createdAt).toEqual(dbObj.createdAt);
    expect(obj.updatedAt).toEqual(dbObj.updatedAt);
    expect(obj.tag).toBe(dbObj.tag);
    expect(obj.convertTo).toEqual(dbObj.convertTo);
  });

  it('should convert toObject', () => {
    const obj = entity.toObject();
    expect(obj).toBeTruthy();
    expect(obj.id).toBe(entity.id);
    expect(obj.createdAt).toBe(entity.createdAt);
    expect(obj.updatedAt).toBe(entity.updatedAt);
    expect(obj.tag).toBe(entity.tag);
    expect(obj.convertTo).toEqual(entity.convertTo);
  });
});
