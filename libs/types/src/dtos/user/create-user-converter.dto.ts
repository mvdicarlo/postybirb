import { IUserConverter } from '../../models';

export type ICreateUserConverterDto = Pick<IUserConverter, 'username' | 'convertTo'>;
