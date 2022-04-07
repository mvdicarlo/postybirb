import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IAccount } from '../models/account.interface';

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

  /**
   * Favorite status of an Account.
   * @type {boolean}
   */
  @Column({ nullable: true, type: 'boolean', default: false })
  favorite: boolean;

  /**
   * User hidden status of an Account.
   * @type {boolean}
   */
  @Column({ nullable: true, type: 'boolean', default: false })
  hidden: boolean;

  constructor(account?: Partial<IAccount>) {
    if (account) {
      Object.assign(this, account);
    }
  }
}
