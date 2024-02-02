import { IAccount } from '../../models';

export type ICreateAccountDto = Pick<IAccount, 'name' | 'website' | 'groups'>;
