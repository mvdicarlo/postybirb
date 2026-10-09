import { RadioField } from '@postybirb/form-builder';
import { ContentBlurValue } from '../twitter-api-service/twitter-api-service';
import { TwitterMessageSubmission } from './twitter-message-submission';

export class TwitterFileSubmission extends TwitterMessageSubmission {
  @RadioField({
    label: 'contentBlur',
    options: [
      {
        label: 'None',
        value: '',
      },
      {
        label: 'Other',
        value: 'other',
      },
      {
        label: 'Adult Content',
        value: 'adult_content',
      },
      {
        label: 'Graphic Violence',
        value: 'graphic_violence',
      },
    ],
  })
  contentBlur: ContentBlurValue;
}
