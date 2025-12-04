
import { plainToInstance } from 'class-transformer';
import 'reflect-metadata';
import { Account } from '../drizzle/models/account.entity';

describe('Transformer Test', () => {
  it('should transform plain object to Account instance', () => {
    const plain = {
      id: 'test-id',
      name: 'test',
      website: 'test-website',
      groups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const instance = plainToInstance(Account, plain);

    console.log('Is instance of Account:', instance instanceof Account);
    console.log('Has withWebsiteInstance:', typeof instance.withWebsiteInstance === 'function');
    
    expect(instance).toBeInstanceOf(Account);
    expect(typeof instance.withWebsiteInstance).toBe('function');
  });
});
