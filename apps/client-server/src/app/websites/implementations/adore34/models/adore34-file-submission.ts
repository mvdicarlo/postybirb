import { BooleanField } from '@postybirb/form-builder';
import { Adore34MessageSubmission } from './adore34-message-submission';

export class Adore34FileSubmission extends Adore34MessageSubmission {
  @BooleanField({
    label: 'thumbnailAsPreview',
    section: 'website',
    order: 7,
    span: 12,
  })
  useThumbnailAsPreview = false;
}
