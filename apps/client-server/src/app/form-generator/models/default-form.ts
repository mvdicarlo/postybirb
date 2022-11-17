import { TagField, TextField } from '@postybirb/form-builder';
import {
  BaseWebsiteOptions,
  DefaultTagValue,
  TagValue,
} from '@postybirb/types';

export class DefualtForm implements BaseWebsiteOptions {
  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

  @TextField({ label: 'placeholder', defaultValue: '' })
  description: unknown;

  @TextField({ label: 'placeholder', defaultValue: '' })
  rating: unknown;
}
