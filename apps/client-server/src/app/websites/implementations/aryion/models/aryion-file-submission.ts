import {
  BooleanField,
  DescriptionField,
  RadioField,
  SelectField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
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
    col: 2,
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
  })
  folder: string[] = [];

  @RadioField({
    label: 'requiredTag',
    col: 2,
    options: [
      { value: '0', label: 'Vore' },
      { value: '1', label: 'Non-Vore' },
    ],
    required: true,
  })
  requiredTag: string;

  @RadioField({
    label: 'viewPermissions',
    col: 2,
    options: [
      { value: 'ALL', label: 'Everyone' },
      { value: 'USER', label: 'Registered Users' },
      { value: 'SELF', label: 'Self Only' },
    ],
  })
  viewPermissions = 'ALL';

  @RadioField({
    label: 'commentPermissions',
    col: 2,
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
    col: 2,
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
    col: 2,
  })
  scraps = false;
}
