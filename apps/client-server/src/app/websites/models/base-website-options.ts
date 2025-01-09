import {
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { Class } from 'type-fest';

export class BaseWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'title',
    required: true,
    col: 1,
    row: 0,
  })
  title = '';

  @TagField({
    col: 1,
    row: 1,
  })
  tags: TagValue = DefaultTagValue();

  @DescriptionField({
    col: 1,
    row: 3,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @RatingField({
    required: true,
    col: 0,
    row: 0,
  })
  rating: SubmissionRating;

  constructor(options: Partial<BaseWebsiteOptions | IWebsiteFormFields> = {}) {
    Object.assign(this, options);
  }

  /**
   * Merges the provided options with the default options of the current class.
   *
   * @param options - The options to merge with the default options.
   * @returns A new instance of the current class with the merged options.
   */
  public mergeDefaults(options: BaseWebsiteOptions): this {
    const isNullOrWhiteSpace = (value: string) => !value || !value.trim();
    const mergedFormFields: IWebsiteFormFields = {
      rating: this.rating || options.rating,
      title: (!isNullOrWhiteSpace(this.title)
        ? this.title
        : (options.title ?? '')
      ).trim(),
      tags: this.tags.overrideDefault
        ? { ...this.tags }
        : {
            overrideDefault: Boolean(this.tags.overrideDefault),
            tags: [...this.tags.tags, ...options.tags.tags],
          },
      description: this.description.overrideDefault
        ? { ...this.description }
        : {
            overrideDefault: Boolean(this.description.overrideDefault),
            description: options.description.description,
            insertTitle: options.description.insertTitle,
            insertTags: options.description.insertTags,
          },
    };
    const newInstance = Object.assign(new (this.constructor as Class<this>)(), {
      ...options,
      ...this,
      ...mergedFormFields,
    });

    return newInstance;
  }
}
