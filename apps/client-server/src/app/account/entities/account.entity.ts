import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IAccount } from '../interfaces/account.interface';

@Entity()
export class Account implements IAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, update: false })
  website: string;
}
