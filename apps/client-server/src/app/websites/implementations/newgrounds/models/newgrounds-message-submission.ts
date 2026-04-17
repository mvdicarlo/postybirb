import { RatingField } from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { NewgroundsBaseSubmission } from './newgrounds-base-submission';

export class NewgroundsMessageSubmission extends NewgroundsBaseSubmission {
  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Suitable for everyone' },
      {
        value: 't',
        label: 'May be inappropriate for kids under 13',
      },
      {
        value: SubmissionRating.MATURE,
        label: 'Mature subject matter. Not for kids!',
      },
      {
        value: SubmissionRating.ADULT,
        label: 'Adults only! This is NSFW and not for kids!',
      },
    ],
  })
  rating: SubmissionRating;
}
