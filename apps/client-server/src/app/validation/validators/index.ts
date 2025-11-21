import * as commonFieldValidators from './common-field-validators';
import * as dateTimeValidators from './datetime-field-validators';
import * as descriptionValidators from './description-validators';
import * as fileValidators from './file-submission-validators';
import * as selectFieldValidators from './select-field-validators';
import * as tagValidators from './tag-validators';
import * as titleValidators from './title-validators';
import { Validator } from './validator.type';

export const validators: Validator[] = [
  ...Object.values(titleValidators),
  ...Object.values(descriptionValidators),
  ...Object.values(tagValidators),
  ...Object.values(fileValidators),
  ...Object.values(commonFieldValidators),
  ...Object.values(selectFieldValidators),
  ...Object.values(dateTimeValidators),
];
