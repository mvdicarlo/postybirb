import {
  DescriptionField,
  DescriptionFieldType,
  formBuilder,
  RatingField,
  RatingFieldType,
  TagField,
  TagFieldType,
  TitleField,
  TitleFieldType,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  Tag,
  TagValue,
} from '@postybirb/types';
import { uniq } from 'lodash';
import { Class } from 'type-fest';

export class BaseWebsiteOptions implements IWebsiteFormFields {
  @TitleField({
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

  public getFormFields(params: Record<string, never> = {}) {
    return formBuilder(this, params);
  }

  public getFormFieldFor(key: 'tags'): TagFieldType;
  public getFormFieldFor(key: 'description'): DescriptionFieldType;
  public getFormFieldFor(key: 'title'): TitleFieldType;
  public getFormFieldFor(key: 'rating'): RatingFieldType;
  public getFormFieldFor(key: keyof IWebsiteFormFields) {
    return this.getFormFields()[key];
  }

  /**
   * Processes the tags and returns them as an array of strings.
   * Performs configured tag properties to filter and transform the tags.
   * Calls the `processTag` method to transform each tag.
   */
  public async getProcessedTags(
    additionalProcessor?: (tag) => Promise<string>,
  ): Promise<Tag[]> {
    const tagsField = this.getFormFieldFor('tags');
    if (tagsField.hidden) {
      return [];
    }

    return uniq(
      (
        await Promise.all(
          this.tags.tags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .map((tag) => additionalProcessor?.(tag) ?? Promise.resolve(tag)), // Mostly for tag converter insert
        )
      )
        .map((tag) =>
          tagsField.spaceReplacer
            ? tag.replaceAll(' ', tagsField.spaceReplacer)
            : tag,
        )
        .map(this.processTag)
        .filter((tag) => tag.length >= (tagsField.minTagLength ?? 1))
        .filter(
          (tag) =>
            tag.length <= (tagsField.maxTagLength ?? Number.MAX_SAFE_INTEGER),
        ),
    ).slice(0, tagsField.maxTags ?? Number.MAX_SAFE_INTEGER);
  }

  /**
   * Tag transformation function that can be overridden by subclasses.
   *
   * @protected
   * @param {string} tag
   * @return {*}  {string}
   */
  protected processTag(tag: string): string {
    return tag;
  }
}
