import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import 'reflect-metadata';
import { DatabaseService } from './database-service';
import { Account } from './models/account.entity';
import * as schema from './schemas';

describe('DatabaseService', () => {
  let service: DatabaseService<'account', Account>;

  beforeEach(() => {
    const migrationsFolder = join(
      __dirname.split('apps')[0],
      'apps',
      'postybirb',
      'src',
      'migrations',
    );
    const db = drizzle(':memory:', { schema });
    migrate(db, { migrationsFolder });
    service = new DatabaseService(db, 'account', (value) =>
      Account.fromDBO(value),
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should insert and delete', async () => {
    const account = await service.insert({
      name: 'test',
      website: 'test',
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
    });

    const foundAccount = await service.findById(account.id, {
      failIfNotFound: true,
    });
    expect(foundAccount).toBeTruthy();
    expect(foundAccount.id).toBe(account.id);
    expect(foundAccount.name).toBe('test');
    expect(foundAccount.website).toBe('test');

    const notFoundAccount = await service.findById('not-found', {
      failIfNotFound: false,
    });
    expect(notFoundAccount).toBeNull();
  });

  it('should throw on find by id not found', async () => {
    await expect(
      service.findById('not-found', { failIfNotFound: true }),
    ).rejects.toThrow('Record with id not-found not found');
  });

  it('should update', async () => {
    const account = await service.insert({
      name: 'test',
      website: 'test',
    });

    await service.update(account.id, {
      name: 'test2',
    });

    const updatedAccount = await service.findById(account.id, {
      failIfNotFound: true,
    });
    expect(updatedAccount).toBeTruthy();
    expect(updatedAccount.id).toBe(account.id);
    expect(updatedAccount.name).toBe('test2');
  });

  it('should find one', async () => {
    await service.insert({
      name: 'test',
      website: 'test',
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
    });

    await service.insert({
      name: 'test2',
      website: 'test',
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
});
