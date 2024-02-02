import { IAccount } from '../../models';

export type IUpdateAccountDto = Pick<IAccount, 'name' | 'groups'>;
