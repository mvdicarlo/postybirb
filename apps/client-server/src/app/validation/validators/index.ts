import * as descriptionValidators from './description-validators';
import * as fileValidators from './file-submission-validators';
import * as selectFieldValidators from './select-field-validatiors';
import * as tagValidators from './tag-validators';
import * as titleValidators from './title-validators';
import { Validator } from './validator.type';

export const validators: Validator[] = [
  ...Object.values(titleValidators),
  ...Object.values(descriptionValidators),
  ...Object.values(tagValidators),
  ...Object.values(fileValidators),
  ...Object.values(selectFieldValidators),
];
