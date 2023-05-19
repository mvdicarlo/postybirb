import { IWebsiteFormFields } from '@postybirb/types';

export interface IUpdateSubmissionOptionsDto<T extends IWebsiteFormFields> {
  id: string;
  data: T;
}
