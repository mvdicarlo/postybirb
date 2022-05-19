import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IAccount } from '../models/account';

/**
 * Account entity.
 */
@Entity()
export class Account implements IAccount {
  /**
   * Id of an account and the session partition key.
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Display name.
   * @type {string}
   */
  @Column({ nullable: false })
  name: string;

  /**
   * Website associated with Account.
   * @type {string}
   */
  @Column({ nullable: false, update: false })
  website: string;

  @Column({ type: 'simple-array', nullable: false })
  groups: string[];

  constructor(account?: Partial<IAccount>) {
    if (account) {
      Object.assign(this, account);
    }
  }
}
