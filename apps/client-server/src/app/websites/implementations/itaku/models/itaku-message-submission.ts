import {
    DescriptionField,
    SelectField,
    TagField,
    TextField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { ItakuAccountData } from './itaku-account-data';

export class ItakuMessageSubmission extends BaseWebsiteOptions {
  @TagField({
    maxTagLength: 59,
  })
  tags: TagValue;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 5000,
    required: true,
  })
  description: DescriptionValue;

  @TextField({
    label: 'contentWarning',
    hidden: false,
    maxLength: 30,
  })
  contentWarning = '';

  @SelectField({
    label: 'visibility',
    options: [
      { value: 'PUBLIC', label: 'Public Gallery' },
      { value: 'PROFILE_ONLY', label: 'Profile Only' },
      { value: 'UNLISTED', label: 'Unlisted' },
    ],
    section: 'website',
    span: 6,
  })
  visibility = 'PUBLIC';

  @SelectField<ItakuAccountData>({
    section: 'website',
    span: 6,
    label: 'folder',
    derive: [
      {
        key: 'notificationFolders',
        populate: 'options',
      },
    ],
    options: [],
    allowMultiple: true,
  })
  folders: string[];
}
