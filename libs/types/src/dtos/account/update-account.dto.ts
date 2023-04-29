import { IAccount } from '../../models';

export type IUpdateAccountDto = Pick<IAccount, 'id' | 'name' | 'groups'>;
