import { ISubmissionAccountData, ISubmissionFields } from '../../models';

export type IUpdateSubmissionAccountDtoDto<T extends ISubmissionFields> = Pick<
  ISubmissionAccountData<T>,
  'id' | 'data' | 'isDefault'
>;
