import * as descriptionValidators from './description-validators';
import * as fileValidators from './file-submission-validators';
import { Validator } from './validator.type';

export const validators: Validator[] = [
  ...Object.values(descriptionValidators),
  ...Object.values(fileValidators),
];
