import { TagField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TestFileSubmission extends BaseWebsiteOptions {
  @TagField({ maxTags: 10 })
  tags: TagValue;
}
