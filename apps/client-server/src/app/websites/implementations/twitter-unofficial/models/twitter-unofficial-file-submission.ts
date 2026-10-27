import { RadioField } from '@postybirb/form-builder';
import { TwitterUnofficialMessageSubmission } from './twitter-unofficial-message-submission';

export type ContentBlurValue =
  | undefined
  | ''
  | 'other'
  | 'adult_content'
  | 'graphic_violence'
  | 'graphical_violence';

export class TwitterUnofficialFileSubmission extends TwitterUnofficialMessageSubmission {
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
