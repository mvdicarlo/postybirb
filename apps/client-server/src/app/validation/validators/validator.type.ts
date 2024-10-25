import {
  ISubmission,
  IWebsiteFormFields,
  PostData,
  ValidationResult,
} from '@postybirb/types';
import { UnknownWebsite } from '../../websites/website';

export type ValidatorParams = {
  result: ValidationResult;
  websiteInstance: UnknownWebsite;
  data: PostData<ISubmission, IWebsiteFormFields>;
  submission: ISubmission;
};

export type Validator = (props: ValidatorParams) => Promise<void>;
