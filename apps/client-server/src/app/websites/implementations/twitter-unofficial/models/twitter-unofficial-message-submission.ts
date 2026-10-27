import {
  DescriptionField,
  RatingField,
  TextField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TwitterUnofficialMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    expectsInlineTags: true,
    expectsInlineTitle: true,
  })
  declare description: DescriptionValue;

  @RatingField({ hidden: true })
  declare rating: SubmissionRating;

  @TextField({ label: 'replyToUrl', section: 'website', span: 6 })
  replyToUrl?: string;

  @TextField({ label: 'quotePostUrl', section: 'website', span: 6 })
  quotePostUrl?: string;
}
