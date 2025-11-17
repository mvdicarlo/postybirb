import { TagField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { PhilomenaFileSubmission } from '../../philomena/models/philomena-file-submission';

export class FurbooruFileSubmission extends PhilomenaFileSubmission {
  @TagField({
    minTags: 5,
  })
  tags: TagValue;
}
