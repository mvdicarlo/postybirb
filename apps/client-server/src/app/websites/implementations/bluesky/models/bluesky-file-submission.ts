import {
  DescriptionField,
  SelectField,
  TextField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class BlueskyFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue;

  @SelectField({
    label: 'rating',
    options: [
      { value: '', label: 'Suitable for all ages' },
      { value: 'sexual', label: 'Adult: Suggestive' },
      { value: 'nudity', label: 'Adult: Nudity' },
      { value: 'porn', label: 'Adult: Porn' },
    ],
  })
  label_rating: '' | 'sexual' | 'nudity' | 'porn';

  @TextField({ label: 'replyToUrl' })
  replyToUrl?: string;

  @TextField({ label: 'threadgate' })
  threadgate?: string;
}
