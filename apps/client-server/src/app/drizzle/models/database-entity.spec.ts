import { IEntity, IEntityDto } from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import 'reflect-metadata';
import { DatabaseEntity, fromDatabaseRecord } from './database-entity';

class TestEntity extends DatabaseEntity {
  public testField: string;

  constructor(entity: Partial<TestEntity>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): IEntity {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as unknown as IEntity;
  }

  toDTO(): IEntityDto {
    return this.toObject() as unknown as IEntityDto;
  }
}

describe('DatabaseEntity', () => {
  let entity: TestEntity;

  beforeEach(() => {
    entity = new TestEntity({
      id: 'id',
      testField: 'test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      testField: 'test',
    };
    const obj = fromDatabaseRecord(TestEntity, dbObj);
    expect(obj).toBeTruthy();
    expect(obj.id).toBe(dbObj.id);
    expect(obj.createdAt).toEqual(dbObj.createdAt);
    expect(obj.updatedAt).toEqual(dbObj.updatedAt);
    expect(obj.testField).toBe(dbObj.testField);
  });

  it('should convert toObject', () => {
    const obj = entity.toObject();
    expect(obj).toBeTruthy();
    expect(obj.id).toBe(entity.id);
    expect(obj.createdAt).toBe(entity.createdAt);
    expect(obj.updatedAt).toBe(entity.updatedAt);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((obj as any).testField).toBe(entity.testField);
  });
});
