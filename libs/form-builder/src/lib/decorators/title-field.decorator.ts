import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type ExtraOptions = {
  maxLength?: number;
  minLength?: number;
  formField: 'input';
};

export const TitleField = createFieldDecorator<string, ExtraOptions>('title')({
  defaults: {
    defaultValue: '',
    formField: 'input',
    label: 'title',
  },
});
