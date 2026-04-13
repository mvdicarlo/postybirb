import 'reflect-metadata';
import { DescriptionFieldType } from '../types';
import { createFieldDecorator } from '../utils/assign-metadata';

type ExtraOptions = {
  maxLength?: number;
  minLength?: number;
  formField: 'input';
  expectedInDescription?: boolean;
};

export const TitleField = createFieldDecorator<string, ExtraOptions>('title')({
  defaults: {
    defaultValue: '',
    formField: 'input',
    label: 'title',
    expectedInDescription: false,
  },
  onCreate(fields, options) {
    // Ensure all fields have been initialized
    setImmediate(() => {
      if (options.expectedInDescription) {
        const description = fields.description as DescriptionFieldType;
        description.defaultValue.insertTitle = true;
      }
    });
  },
});
