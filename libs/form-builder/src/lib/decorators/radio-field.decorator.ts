/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { createFieldDecorator } from '../utils/assign-metadata';

export type RadioOption = {
  label: string;
  value: Primitive;
};

type ExtraOptions = {
  options: RadioOption[];
  layout?: 'vertical' | 'horizontal';
};

export const RadioField = createFieldDecorator<string, ExtraOptions>('radio')({
  defaults: {
    formField: 'radio',
    layout: 'vertical',
  },
});