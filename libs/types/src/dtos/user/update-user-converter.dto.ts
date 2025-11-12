import { IUserConverter } from '../../models';

export type IUpdateUserConverterDto = Partial<Pick<IUserConverter, 'username' | 'convertTo'>>;
