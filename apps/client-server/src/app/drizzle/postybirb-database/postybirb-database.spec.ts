import { Schemas } from '@postybirb/database';
import { eq as equals } from 'drizzle-orm';
import 'reflect-metadata';
import { PostyBirbDatabase } from './postybirb-database';

describe('PostyBirbDatabase', () => {
  let service: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(() => {
    service = new PostyBirbDatabase('AccountSchema');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should insert and delete', async () => {
    const account = await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    const accounts = await service.findAll();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe(account.id);
    expect(accounts[0].name).toBe('test');
    expect(accounts[0].website).toBe('test');

    await service.deleteById([account.id]);

    const accountsAfterDelete = await service.findAll();
    expect(accountsAfterDelete).toHaveLength(0);
  });

  it('should find by id', async () => {
    const account = await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    const foundAccount = await service.findById(account.id, {
      failOnMissing: true,
    });
    expect(foundAccount).toBeTruthy();
    expect(foundAccount.id).toBe(account.id);
    expect(foundAccount.name).toBe('test');
    expect(foundAccount.website).toBe('test');

    const notFoundAccount = await service.findById('not-found', {
      failOnMissing: false,
    });
    expect(notFoundAccount).toBeNull();
  });

  it('should throw on find by id not found', async () => {
    await expect(
      service.findById('not-found', { failOnMissing: true }),
    ).rejects.toThrow('Record with id not-found not found');
  });

  it('should update', async () => {
    const account = await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    await service.update(account.id, {
      name: 'test2',
    });

    const updatedAccount = await service.findById(account.id, {
      failOnMissing: true,
    });
    expect(updatedAccount).toBeTruthy();
    expect(updatedAccount.id).toBe(account.id);
    expect(updatedAccount.name).toBe('test2');
  });

  it('should find one', async () => {
    await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    const foundAccount = await service.findOne({
      where: (account, { eq }) => eq(account.name, 'test'),
    });

    expect(foundAccount).toBeTruthy();
    expect(foundAccount?.name).toBe('test');
  });

  it('should find many', async () => {
    await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    await service.insert({
      name: 'test2',
      website: 'test',
      groups: [],
    });

    const foundAccounts = await service.find({
      where: (account, { eq }) => eq(account.website, 'test'),
    });

    expect(foundAccounts).toHaveLength(2);
  });

  it('should return empty array on find many not found', async () => {
    const foundAccounts = await service.find({
      where: (account, { eq }) => eq(account.website, 'test'),
    });

    expect(foundAccounts).toHaveLength(0);
  });

  it('should notify subscribers on create', async () => {
    const subscriber = jest.fn();
    service.subscribe('AccountSchema', subscriber);

    const entity = await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    expect(subscriber).toHaveBeenCalledWith([entity.id], 'insert');
  });

  it('should select', async () => {
    await service.insert({
      name: 'test',
      website: 'test',
      groups: [],
    });

    const foundAccounts = await service.select(
      equals(Schemas.AccountSchema.name, 'test'),
    );

    expect(foundAccounts).toHaveLength(1);
  });
});
