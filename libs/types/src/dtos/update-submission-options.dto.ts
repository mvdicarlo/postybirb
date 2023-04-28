import { ISubmissionFields } from '@postybirb/types';

export interface IUpdateSubmissionOptionsDto<T extends ISubmissionFields> {
  id: string;
  data: T;
}
