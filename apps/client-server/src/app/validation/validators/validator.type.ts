import {
  ISubmission,
  PostData,
  ValidationMessage,
  ValidationResult,
} from '@postybirb/types';
import { FileConverterService } from '../../file-converter/file-converter.service';
import { FileService } from '../../file/file.service';
import { SubmissionValidator } from '../../websites/commons/validator';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { UnknownWebsite } from '../../websites/website';

export type ValidatorParams = {
  result: ValidationResult;
  validator: FieldValidator;
  websiteInstance: UnknownWebsite;
  data: PostData;
  submission: ISubmission;
  fileConverterService: FileConverterService;
  fileService: FileService;
  mergedWebsiteOptions: BaseWebsiteOptions;
};

export type Validator = (props: ValidatorParams) => Promise<void>;

export class FieldValidator extends SubmissionValidator {
  constructor(
    override errors: ValidationMessage[],
    override warnings: ValidationMessage[],
  ) {
    super();
  }
}
