import { DescriptionField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BlueskyFileSubmission } from './bluesky-file-submission';

export class BlueskyMessageSubmission extends BlueskyFileSubmission {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;
}
