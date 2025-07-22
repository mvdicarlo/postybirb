import {
  BooleanField,
  DescriptionField,
  RadioField,
  SelectField
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class AryionFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @SelectField({
    label: 'folder',
    options: [],
    required: true,
  })
  folder: string[];

  @RadioField({
    label: 'requiredTag',
    options: [
      { value: '0', label: 'Vore' },
      { value: '1', label: 'Non-Vore' },
    ],
    required: true,
  })
  requiredTag: string;

  @RadioField({
    label: 'viewPermissions',
    options: [
      { value: 'ALL', label: 'Everyone' },
      { value: 'USER', label: 'Registered Users' },
      { value: 'SELF', label: 'Self Only' },
    ],
  })
  viewPermissions = 'ALL';

  @RadioField({
    label: 'commentPermissions',
    options: [
      { value: 'USER', label: 'Registered Users' },
      { value: 'BLACK', label: 'All But Blocked' },
      { value: 'WHITE', label: 'Friends Only' },
      { value: 'SELF', label: 'Self Only' },
      { value: 'NONE', label: 'Nobody' },
    ],
  })
  commentPermissions = 'USER';

  @RadioField({
    label: 'tagPermissions',
    options: [
      { value: 'USER', label: 'Registered Users' },
      { value: 'BLACK', label: 'All But Blocked' },
      { value: 'WHITE', label: 'Friends Only' },
      { value: 'SELF', label: 'Self Only' },
    ],
  })
  tagPermissions = 'USER';

  @BooleanField({
    label: 'scraps',
  })
  scraps = false;
}
