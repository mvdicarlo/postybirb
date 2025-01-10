import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
} from '@postybirb/types';
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type DescriptionExtraFields = {
  minDescriptionLength?: number;
  maxDescriptionLength?: number;
  descriptionType?: DescriptionType;
};

export const DescriptionField = createFieldDecorator<
  DescriptionValue,
  DescriptionExtraFields
>('description')({
  defaults: {
    label: 'description',
    formField: 'description',
    defaultValue: DefaultDescriptionValue(),
    descriptionType: DescriptionType.HTML,
  },
});
