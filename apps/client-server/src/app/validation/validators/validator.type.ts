import { ISubmission, PostData, ValidationResult } from '@postybirb/types';
import { FileConverterService } from '../../file-converter/file-converter.service';
import { UnknownWebsite } from '../../websites/website';

export type ValidatorParams = {
  result: ValidationResult;
  websiteInstance: UnknownWebsite;
  data: PostData;
  submission: ISubmission;
  fileConverterService: FileConverterService;
};

export type Validator = (props: ValidatorParams) => Promise<void>;
